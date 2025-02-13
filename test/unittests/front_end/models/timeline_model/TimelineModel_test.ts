// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Platform from '../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as TimelineModel from '../../../../../front_end/models/timeline_model/timeline_model.js';
import * as TraceEngine from '../../../../../front_end/models/trace/trace.js';

import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {
  DevToolsTimelineCategory,
  FakeStorage,
  makeFakeSDKEventFromPayload,
  traceModelFromTraceFile,
} from '../../helpers/TimelineHelpers.js';

// Various events listing processes and threads used by all the tests.
const preamble = [
  {
    'args': {'name': 'CrBrowserMain'},
    'cat': '__metadata',
    'name': 'thread_name',
    'ph': 'M',
    'pid': 1537480,
    'tid': 1537480,
    'ts': 0,
  },
  {
    'args': {'name': 'CrRendererMain'},
    'cat': '__metadata',
    'name': 'thread_name',
    'ph': 'M',
    'pid': 1537729,
    'tid': 1,
    'ts': 0,
  },
  {
    'args': {'name': 'AuctionV8HelperThread'},
    'cat': '__metadata',
    'name': 'thread_name',
    'ph': 'M',
    'pid': 1538739,
    'tid': 7,
    'ts': 0,
  },
  {
    'args': {'name': 'AuctionV8HelperThread'},
    'cat': '__metadata',
    'name': 'thread_name',
    'ph': 'M',
    'pid': 1538738,
    'tid': 7,
    'ts': 0,
  },
  // A child thread in the worklet process which has some events, it's supposed to
  // be skipped.
  {
    'args': {'name': 'Chrome_ChildIOThread'},
    'cat': '__metadata',
    'name': 'thread_name',
    'ph': 'M',
    'pid': 1538738,
    'tid': 4,
    'ts': 0,
  },
  {
    'args': {},
    'cat': 'disabled-by-default-devtools.timeline',
    'dur': 94,
    'name': 'RunTask',
    'ph': 'X',
    'pid': 1538738,
    'tdur': 93,
    'tid': 4,
    'ts': 962632609083,
    'tts': 3006,
  },
  {
    'args': {'name': 'Renderer'},
    'cat': '__metadata',
    'name': 'process_name',
    'ph': 'M',
    'pid': 1537729,
    'tid': 0,
    'ts': 0,
  },
  {
    'args': {'name': 'Browser'},
    'cat': '__metadata',
    'name': 'process_name',
    'ph': 'M',
    'pid': 1537480,
    'tid': 0,
    'ts': 0,
  },
  {
    'args': {'name': 'Service: auction_worklet.mojom.AuctionWorkletService'},
    'cat': '__metadata',
    'name': 'process_name',
    'ph': 'M',
    'pid': 1538739,
    'tid': 0,
    'ts': 0,
  },
  {
    'args': {'name': 'Service: auction_worklet.mojom.AuctionWorkletService'},
    'cat': '__metadata',
    'name': 'process_name',
    'ph': 'M',
    'pid': 1538738,
    'tid': 0,
    'ts': 0,
  },
  {
    'args': {
      'data': {
        'frameTreeNodeId': 7,
        'frames': [{
          'frame': '76213A7F71B7ACD4C6551AC68B888978',
          'name': '',
          'processId': 1537729,
          'url': 'https://192.168.0.105/run.html',
        }],
        'persistentIds': true,
      },
    },
    'cat': 'disabled-by-default-devtools.timeline',
    'name': 'TracingStartedInBrowser',
    'ph': 'I',
    'pid': 1537480,
    's': 't',
    'tid': 1537480,
    'ts': 962632191080,
    'tts': 23601918,
  },
  {
    'args': {
      'data': {
        'frame': '76213A7F71B7ACD4C6551AC68B888978',
        'name': '',
        'processId': 1537729,
        'url': 'https://192.168.0.105/run.html',
      },
    },
    'cat': 'disabled-by-default-devtools.timeline',
    'name': 'FrameCommittedInBrowser',
    'ph': 'I',
    'pid': 1537480,
    's': 't',
    'tid': 1537480,
    'ts': 962632244598,
    'tts': 23622650,
  },
];

interface FakeLayoutShiftProperties {
  startTime: number;
  hadRecentInput: boolean;
  weightedScoreDelta?: number;
}

function makeFakeLayoutShift(properties: FakeLayoutShiftProperties): SDK.TracingModel.Event {
  const fakeLayoutShift = {
    args: {
      data: {
        had_recent_input: properties.hadRecentInput,
        weighted_score_delta: properties.weightedScoreDelta,
      },
    },
    startTime: properties.startTime,
  } as unknown as SDK.TracingModel.Event;

  return fakeLayoutShift;
}
class TrackSummary {
  name: string = '';
  type: TimelineModel.TimelineModel.TrackType = TimelineModel.TimelineModel.TrackType.Other;
  forMainFrame: boolean = false;
  url: Platform.DevToolsPath.UrlString = Platform.DevToolsPath.EmptyUrlString;
  threadName: string = '';
  threadId: number = -1;
  processId: number = -1;
  processName: string = '';
}

function summarize(track: TimelineModel.TimelineModel.Track): TrackSummary {
  return {
    name: track.name,
    type: track.type,
    forMainFrame: track.forMainFrame,
    url: track.url,
    threadName: track.thread ? track.thread.name() : '(no thread)',
    threadId: track.thread ? track.thread.id() : -1,
    processId: track.thread ? track.thread.process().id() : -1,
    processName: track.thread ? track.thread.process().name() : '(no thread)',
  };
}

function summarizeArray(tracks: TimelineModel.TimelineModel.Track[]): TrackSummary[] {
  return tracks.map(summarize);
}

describeWithEnvironment('TimelineModel', () => {
  function traceWithEvents(events: readonly SDK.TracingManager.EventPayload[]): {
    tracingModel: SDK.TracingModel.TracingModel,
    timelineModel: TimelineModel.TimelineModel.TimelineModelImpl,
  } {
    const tracingModel = new SDK.TracingModel.TracingModel(new FakeStorage());
    const timelineModel = new TimelineModel.TimelineModel.TimelineModelImpl();
    tracingModel.addEvents((preamble as unknown as SDK.TracingManager.EventPayload[]).concat(events));
    tracingModel.tracingComplete();
    timelineModel.setEvents(tracingModel);
    return {
      tracingModel,
      timelineModel,
    };
  }

  describe('interaction events', () => {
    it('pulls out the expected interaction events from a trace', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const interactionsTrack =
          timelineModel.tracks().find(track => track.type === TimelineModel.TimelineModel.TrackType.UserInteractions);
      if (!interactionsTrack) {
        assert.fail('No interactions track was found.');
        return;
      }
      const foundInteractions = interactionsTrack.asyncEvents;
      // We expect there to be 3 interactions:
      // 1. The pointerdown event when the user clicked.
      // 2. The pointerup event.
      // 3. The click event.
      assert.lengthOf(foundInteractions, 3);
      assert.deepEqual(foundInteractions.map(event => event.args.data.type), ['pointerdown', 'pointerup', 'click']);
      // All interactions should have the same interactionId as they all map to the same user interaction.
      assert.isTrue(foundInteractions.every(event => {
        return event.args.data.interactionId === 1540;
      }));
    });

    it('detects correct events for a click and keydown interaction', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-keydown.json.gz');
      const interactionsTrack =
          timelineModel.tracks().find(track => track.type === TimelineModel.TimelineModel.TrackType.UserInteractions);
      if (!interactionsTrack) {
        assert.fail('No interactions track was found.');
        return;
      }
      const foundInteractions = interactionsTrack.asyncEvents;
      // We expect there to be 3 interactions:
      // User clicks on input:
      // 1.pointerdown, 2. pointerup, 3. click
      // User types into input:
      // 4. keydown, 5. keyup
      assert.deepEqual(
          foundInteractions.map(event => event.args.data.type),
          ['pointerdown', 'pointerup', 'click', 'keydown', 'keyup']);

      assert.deepEqual(foundInteractions.map(e => e.args.data.interactionId), [
        // The first three events relate to the click, so they have the same InteractionID
        7371,
        7371,
        7371,
        // The final two relate to the keypress, so they have the same InteractionID
        7378,
        7378,
      ]);
    });

    it('finds all interaction events with a duration and interactionId', async () => {
      const {timelineModel} = traceWithEvents([
        {
          cat: 'devtools.timeline',
          ph: TraceEngine.Types.TraceEvents.Phase.ASYNC_NESTABLE_START,
          pid: 1537729,  // the Renderer Thread
          tid: 1,        // CrRendererMain
          id: '1234',
          ts: 10,
          dur: 500,
          scope: 'scope',
          name: 'EventTiming',
          args: {
            data: {
              'duration': 16,
              'interactionId': 9700,
              'nodeId': 0,
              'processingEnd': 993,
              'processingStart': 993,
              'timeStamp': 985,
              'type': 'pointerdown',
            },
          } as unknown as SDK.TracingManager.EventPayload['args'],
        },
        // Has an interactionId of 0, so should NOT be included.
        {
          cat: 'devtools.timeline',
          ph: TraceEngine.Types.TraceEvents.Phase.ASYNC_NESTABLE_START,
          pid: 1537729,  // the Renderer Thread
          tid: 1,        // CrRendererMain
          id: '1234',
          ts: 10,
          dur: 500,
          scope: 'scope',
          name: 'EventTiming',
          args: {
            data: {
              'duration': 16,
              'interactionId': 0,
              'nodeId': 0,
              'processingEnd': 993,
              'processingStart': 993,
              'timeStamp': 985,
              'type': 'pointerdown',
            },
          } as unknown as SDK.TracingManager.EventPayload['args'],
        },
        // Has an duration of 0, so should NOT be included.
        {
          cat: 'devtools.timeline',
          ph: TraceEngine.Types.TraceEvents.Phase.ASYNC_NESTABLE_START,
          pid: 1537729,  // the Renderer Thread
          tid: 1,        // CrRendererMain
          id: '1234',
          ts: 10,
          dur: 500,
          scope: 'scope',
          name: 'EventTiming',
          args: {
            data: {
              'duration': 0,
              'interactionId': 0,
              'nodeId': 0,
              'processingEnd': 993,
              'processingStart': 993,
              'timeStamp': 985,
              'type': 'pointerdown',
            },
          } as unknown as SDK.TracingManager.EventPayload['args'],
        },
      ]);
      const interactionsTrack =
          timelineModel.tracks().find(track => track.type === TimelineModel.TimelineModel.TrackType.UserInteractions);
      if (!interactionsTrack) {
        assert.fail('No interactions track was found.');
        return;
      }
      const foundInteractions = interactionsTrack.asyncEvents;
      assert.lengthOf(foundInteractions, 1);
    });
  });
  describe('isMarkerEvent', () => {
    it('is true for a timestamp event', async () => {
      // Note: exact trace does not matter here, but we need a real one so all the metadata is set correctly on the TimelineModel
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');

      const timestampEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.TimeStamp,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
      });
      assert.isTrue(timelineModel.isMarkerEvent(timestampEvent));
    });
    it('is true for a Mark First Paint event that is on the main frame', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markFirstPaintEventOnMainFrame = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkFirstPaint,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          frame: timelineModel.mainFrameID(),
          data: {},
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markFirstPaintEventOnMainFrame));
    });

    it('is true for a Mark FCP event that is on the main frame', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markFCPEventOnMainFrame = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkFCP,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          frame: timelineModel.mainFrameID(),
          data: {},
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markFCPEventOnMainFrame));
    });

    it('is false for a Mark FCP event that is not on the main frame', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markFCPEventOnOtherFrame = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkFCP,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          frame: 'not-main-frame',
          data: {},
        },
      });
      assert.isFalse(timelineModel.isMarkerEvent(markFCPEventOnOtherFrame));
    });

    it('is false for a Mark First Paint event that is not on the main frame', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markFirstPaintEventOnOtherFrame = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkFirstPaint,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          frame: 'not-main-frame',
          data: {},
        },
      });
      assert.isFalse(timelineModel.isMarkerEvent(markFirstPaintEventOnOtherFrame));
    });

    it('is true for a MarkDOMContent event is set to isMainFrame', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markDOMContentEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkDOMContent,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isMainFrame: true,
          },
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markDOMContentEvent));
    });

    it('is true for a MarkDOMContent event that set to isOutermostMainFrame', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markDOMContentEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkDOMContent,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isOutermostMainFrame: true,
          },
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markDOMContentEvent));
    });

    it('is false for a MarkDOMContent event that set to isOutermostMainFrame=false', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markDOMContentEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkDOMContent,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isOutermostMainFrame: false,
          },
        },
      });
      assert.isFalse(timelineModel.isMarkerEvent(markDOMContentEvent));
    });

    it('is false for a MarkDOMContent event that set to isMainFrame=false', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markDOMContentEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkDOMContent,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isMainFrame: false,
          },
        },
      });
      assert.isFalse(timelineModel.isMarkerEvent(markDOMContentEvent));
    });

    it('is true for a MarkLoad event that set to isMainFrame=true', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markLoadEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkLoad,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isMainFrame: true,
          },
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markLoadEvent));
    });

    it('is true for a MarkLCPCandidate event that set to isOutermostMainFrame=true', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markLCPCandidateEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkLCPCandidate,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isOutermostMainFrame: true,
          },
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markLCPCandidateEvent));
    });

    it('is true for a MarkLCPInvalidate event that set to isOutermostMainFrame=true', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const markLCPInvalidateEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.MarkLCPInvalidate,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        args: {
          data: {
            isOutermostMainFrame: true,
          },
        },
      });
      assert.isTrue(timelineModel.isMarkerEvent(markLCPInvalidateEvent));
    });

    it('is false for some unrelated event that is never a marker such as an animation', async () => {
      const {timelineModel} = await traceModelFromTraceFile('slow-interaction-button-click.json.gz');
      const animationEvent = makeFakeSDKEventFromPayload({
        categories: [DevToolsTimelineCategory],
        name: TimelineModel.TimelineModel.RecordType.Animation,
        ph: TraceEngine.Types.TraceEvents.Phase.COMPLETE,
        ts: 1,
        threadId: 1,
      });
      assert.isFalse(timelineModel.isMarkerEvent(animationEvent));
    });
  });

  it('creates tracks for auction worklets', () => {
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538738,
            'target': 'a1e485ff-f876-41cb-90ca-85c4b684b302',
            'type': 'seller',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633184323,
        'tts': 23961306,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': 'd11f0ac4-f92c-4d2d-a665-8a00654567f0',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189649,
        'tts': 23962898,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': '7cf70074-8b59-45ef-8f30-0d61c6ce3cd6',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189667,
        'tts': 23962912,
      },
    ] as unknown as SDK.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        name: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.MainThread,
        forMainFrame: true,
        url: 'https://192.168.0.105/run.html' as Platform.DevToolsPath.UrlString,
        threadName: 'CrRendererMain',
        threadId: 1,
        processId: 1537729,
        processName: 'Renderer',
      },
      {
        name: 'Bidder Worklet — https://192.168.0.105',
        type: TimelineModel.TimelineModel.TrackType.Other,
        forMainFrame: false,
        url: 'https://192.168.0.105' as Platform.DevToolsPath.UrlString,
        threadName: 'AuctionV8HelperThread',
        threadId: 7,
        processId: 1538739,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
      },
      {
        name: 'Seller Worklet — https://192.168.0.105',
        type: TimelineModel.TimelineModel.TrackType.Other,
        forMainFrame: false,
        url: 'https://192.168.0.105' as Platform.DevToolsPath.UrlString,
        threadName: 'AuctionV8HelperThread',
        threadId: 7,
        processId: 1538738,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
      },
      {
        name: '',
        type: TimelineModel.TimelineModel.TrackType.Experience,
        forMainFrame: false,
        url: Platform.DevToolsPath.EmptyUrlString,
        threadName: 'CrRendererMain',
        threadId: 1,
        processId: 1537729,
        processName: 'Renderer',
      },
    ]);
  });

  it('handles auction worklets running in renderer', () => {
    // Also shows it merging the different types, and not
    // throwing away another thread there.
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1537729,
            'target': 'a1e485ff-f876-41cb-90ca-85c4b684b302',
            'type': 'seller',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633184323,
        'tts': 23961306,
      },
      {
        'args': {'name': 'AuctionV8HelperThread'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1537729,
        'tid': 7,
        'ts': 0,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1537729,
            'target': 'd11f0ac4-f92c-4d2d-a665-8a00654567f0',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189649,
        'tts': 23962898,
      },
      {
        'args': {'name': 'ThreadPoolForegroundWorker'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1537729,
        'tid': 15,
        'ts': 0,
      },
      {
        'args': {},
        'cat': 'devtools.timeline,disabled-by-default-v8.gc',
        'dur': 531,
        'name': 'V8.GC_BACKGROUND_UNMAPPER',
        'ph': 'X',
        'pid': 1537729,
        'tdur': 533,
        'tid': 15,
        'ts': 962632415206,
        'tts': 165467,
      },
    ] as unknown as SDK.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        forMainFrame: false,
        name: 'Auction Worklet — https://192.168.0.105',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 7,
        threadName: 'AuctionV8HelperThread',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: 'https://192.168.0.105' as Platform.DevToolsPath.UrlString,
      },
      {
        forMainFrame: true,
        name: 'CrRendererMain',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.MainThread,
        url: 'https://192.168.0.105/run.html' as Platform.DevToolsPath.UrlString,
      },
      {
        forMainFrame: false,
        name: 'ThreadPoolForegroundWorker',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 15,
        threadName: 'ThreadPoolForegroundWorker',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        forMainFrame: false,
        name: '',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.Experience,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
    ]);
  });

  it('handles different URLs in same auction worklet thread', () => {
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1537729,
            'target': 'a1e485ff-f876-41cb-90ca-85c4b684b302',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633184323,
        'tts': 23961306,
      },
      {
        'args': {'name': 'AuctionV8HelperThread'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1537729,
        'tid': 7,
        'ts': 0,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.106',
            'pid': 1537729,
            'target': 'd11f0ac4-f92c-4d2d-a665-8a00654567f0',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189649,
        'tts': 23962898,
      },
      {
        'args': {'name': 'ThreadPoolForegroundWorker'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1537729,
        'tid': 15,
        'ts': 0,
      },
      {
        'args': {},
        'cat': 'devtools.timeline,disabled-by-default-v8.gc',
        'dur': 531,
        'name': 'V8.GC_BACKGROUND_UNMAPPER',
        'ph': 'X',
        'pid': 1537729,
        'tdur': 533,
        'tid': 15,
        'ts': 962632415206,
        'tts': 165467,
      },
    ] as unknown as SDK.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        forMainFrame: false,
        name: 'Bidder Worklet',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 7,
        threadName: 'AuctionV8HelperThread',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        forMainFrame: true,
        name: 'CrRendererMain',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.MainThread,
        url: 'https://192.168.0.105/run.html' as Platform.DevToolsPath.UrlString,
      },
      {
        forMainFrame: false,
        name: 'ThreadPoolForegroundWorker',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 15,
        threadName: 'ThreadPoolForegroundWorker',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        forMainFrame: false,
        name: '',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.Experience,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
    ]);
  });

  it('includes utility process main thread, too', () => {
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': 'a1e485ff-f876-41cb-90ca-85c4b684b302',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633184323,
        'tts': 23961306,
      },
      {
        'args': {'name': 'AuctionV8HelperThread'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1538739,
        'tid': 7,
        'ts': 0,
      },
      {
        'args': {'name': 'CrUtilityMain'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1538739,
        'tid': 1,
        'ts': 0,
      },
      {
        'args': {'name': 'ThreadPoolForegroundWorker'},
        'cat': '__metadata',
        'name': 'thread_name',
        'ph': 'M',
        'pid': 1538739,
        'tid': 15,
        'ts': 0,
      },
      {
        'args': {},
        'cat': 'devtools.timeline,disabled-by-default-v8.gc',
        'dur': 531,
        'name': 'V8.GC_BACKGROUND_UNMAPPER',
        'ph': 'X',
        'pid': 1538739,
        'tdur': 533,
        'tid': 15,
        'ts': 962632415206,
        'tts': 165467,
      },
      {
        'args': {},
        'cat': 'devtools.timeline',
        'dur': 531,
        'name': 'ResourceSendRequest',
        'ph': 'X',
        'pid': 1538739,
        'tdur': 533,
        'tid': 1,
        'ts': 962632415206,
        'tts': 165467,
      },
    ] as unknown as SDK.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: 'Other',
        url: '',
      },
      {
        forMainFrame: true,
        name: 'CrRendererMain',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: 'MainThread',
        url: 'https://192.168.0.105/run.html',
      },
      {
        forMainFrame: false,
        name: 'Bidder Worklet — https://192.168.0.105',
        processId: 1538739,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
        threadId: 7,
        threadName: 'AuctionV8HelperThread',
        type: 'Other',
        url: 'https://192.168.0.105',
      },
      {
        forMainFrame: false,
        name: 'Auction Worklet Service — https://192.168.0.105',
        processId: 1538739,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
        threadId: 1,
        threadName: 'CrUtilityMain',
        type: 'Other',
        url: 'https://192.168.0.105',
      },
      {
        forMainFrame: false,
        name: '',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 1,
        threadName: 'CrRendererMain',
        type: 'Experience',
        url: '',
      },
    ]);
  });

  it('handles auction worklet exit events', () => {
    const {timelineModel} = traceWithEvents([
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': 'd11f0ac4-f92c-4d2d-a665-8a00654567f0',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189649,
      },
      {
        'args': {},
        'cat': 'disabled-by-default-devtools.timeline',
        'dur': 10,
        'name': 'RunTaskA',
        'ph': 'X',
        'pid': 1538739,
        'tid': 7,
        'ts': 962633189650,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': 'd11f0ac4-f92c-4d2d-a665-8a00654567f0',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletDoneWithProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189669,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': '7cf70074-8b59-45ef-8f30-0d61c6ce3cd6',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletRunningInProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633189667,
      },
      {
        'args': {},
        'cat': 'disabled-by-default-devtools.timeline',
        'dur': 10,
        'name': 'RunTaskB',
        'ph': 'X',
        'pid': 1538739,
        'tid': 7,
        'ts': 962633189668,
      },
      {
        'args': {
          'data': {
            'host': '192.168.0.105',
            'pid': 1538739,
            'target': '7cf70074-8b59-45ef-8f30-0d61c6ce3cd6',
            'type': 'bidder',
          },
        },
        'cat': 'disabled-by-default-devtools.timeline',
        'name': 'AuctionWorkletDoneWithProcess',
        'ph': 'I',
        'pid': 1537480,
        's': 't',
        'tid': 1537480,
        'ts': 962633199669,
      },
    ] as unknown as SDK.TracingManager.EventPayload[]);
    const trackInfo = summarizeArray(timelineModel.tracks());
    assert.deepEqual(trackInfo, [
      {
        forMainFrame: false,
        name: 'Thread 0',
        processId: 1537729,
        processName: 'Renderer',
        threadId: 0,
        threadName: '',
        type: TimelineModel.TimelineModel.TrackType.Other,
        url: Platform.DevToolsPath.EmptyUrlString,
      },
      {
        name: 'CrRendererMain',
        type: TimelineModel.TimelineModel.TrackType.MainThread,
        forMainFrame: true,
        url: 'https://192.168.0.105/run.html' as Platform.DevToolsPath.UrlString,
        threadName: 'CrRendererMain',
        threadId: 1,
        processId: 1537729,
        processName: 'Renderer',
      },
      {
        name: 'Bidder Worklet — https://192.168.0.105',
        type: TimelineModel.TimelineModel.TrackType.Other,
        forMainFrame: false,
        url: 'https://192.168.0.105' as Platform.DevToolsPath.UrlString,
        threadName: 'AuctionV8HelperThread',
        threadId: 7,
        processId: 1538739,
        processName: 'Service: auction_worklet.mojom.AuctionWorkletService',
      },
      {
        name: '',
        type: TimelineModel.TimelineModel.TrackType.Experience,
        forMainFrame: false,
        url: Platform.DevToolsPath.EmptyUrlString,
        threadName: 'CrRendererMain',
        threadId: 1,
        processId: 1537729,
        processName: 'Renderer',
      },
    ]);

    // Now, verify that the actual track honors the timestamp boundaries.
    for (const track of timelineModel.tracks()) {
      if (track.name !== 'Bidder Worklet — https://192.168.0.105') {
        continue;
      }
      assert.deepEqual(track.events.map(event => event.name), [
        'thread_name',  // Metadata event for this worklet
        // Tasks within this worklet
        'RunTaskA',
        'RunTaskB',
      ]);
    }
  });

  describe('#isEventTimingInteractionEvent', () => {
    it('returns true for an event timing with a duration and interactionId', () => {
      const {timelineModel} = traceWithEvents([]);
      const event = {
        name: 'EventTiming',
        args: {
          data: {
            duration: 100,
            interactionId: 200,
          },
        },
      } as unknown as SDK.TracingModel.Event;
      assert.isTrue(timelineModel.isEventTimingInteractionEvent(event));
    });

    it('returns false if the event has no duration', () => {
      const {timelineModel} = traceWithEvents([]);
      const event = {
        name: 'EventTiming',
        args: {
          data: {
            interactionId: 200,
          },
        },
      } as unknown as SDK.TracingModel.Event;
      assert.isFalse(timelineModel.isEventTimingInteractionEvent(event));
    });

    it('returns false if the event has no interaction ID', () => {
      const {timelineModel} = traceWithEvents([]);
      const event = {
        name: 'EventTiming',
        args: {
          data: {
            duration: 200,
          },
        },
      } as unknown as SDK.TracingModel.Event;
      assert.isFalse(timelineModel.isEventTimingInteractionEvent(event));
    });

    it('returns false if the duration is 0', () => {
      const {timelineModel} = traceWithEvents([]);
      const event = {
        name: 'EventTiming',
        args: {
          data: {
            duration: 0,
            interactionId: 200,
          },
        },
      } as unknown as SDK.TracingModel.Event;
      assert.isFalse(timelineModel.isEventTimingInteractionEvent(event));
    });

    it('returns false if the interactionId is 0', () => {
      const {timelineModel} = traceWithEvents([]);
      const event = {
        name: 'EventTiming',
        args: {
          data: {
            duration: 100,
            interactionId: 0,
          },
        },
      } as unknown as SDK.TracingModel.Event;
      assert.isFalse(timelineModel.isEventTimingInteractionEvent(event));
    });
  });

  describe('rendering user timings in the correct order', () => {
    it('correctly populates the track with basic performance measures', async () => {
      const {timelineModel} = await traceModelFromTraceFile('user-timings.json.gz');
      const userTimingEventNames: string[] = [];
      for (const track of timelineModel.tracks()) {
        if (track.type !== TimelineModel.TimelineModel.TrackType.Timings) {
          continue;
        }
        for (const event of track.asyncEvents) {
          if (event.hasCategory(TimelineModel.TimelineModel.TimelineModelImpl.Category.UserTiming)) {
            userTimingEventNames.push(event.name);
          }
        }
      }
      assert.deepEqual(userTimingEventNames, [
        'first measure',
        'second measure',
        'third measure',
      ]);
    });
    it('correctly populates the track with nested timings in the correct order', async () => {
      const {timelineModel} = await traceModelFromTraceFile('user-timings-complex.json.gz');
      const userTimingEventNames: string[] = [];
      for (const track of timelineModel.tracks()) {
        if (track.type !== TimelineModel.TimelineModel.TrackType.Timings) {
          continue;
        }
        for (const event of track.asyncEvents) {
          // This trace has multiple user timings events, in this instance we only care about the ones that include 'nested' in the name.
          if (event.hasCategory(TimelineModel.TimelineModel.TimelineModelImpl.Category.UserTiming) &&
              event.name.includes('nested')) {
            userTimingEventNames.push(event.name);
          }
        }
      }
      assert.deepEqual(userTimingEventNames, [
        'nested-a',
        'nested-b',
        'nested-c',
        'nested-d',
      ]);
    });

    it('renders all the performance marks from the trace', async () => {
      const {timelineModel} = await traceModelFromTraceFile('user-timings-complex.json.gz');
      const userTimingPerformanceMarkNames: string[] = [];
      for (const track of timelineModel.tracks()) {
        if (track.type !== TimelineModel.TimelineModel.TrackType.Timings) {
          continue;
        }
        for (const event of track.syncEvents()) {
          assert.strictEqual(event.phase, TraceEngine.Types.TraceEvents.Phase.MARK);
          userTimingPerformanceMarkNames.push(event.name);
        }
      }
      assert.deepEqual(
          userTimingPerformanceMarkNames,
          [
            'nested-a-start',
            'nested-b-start',
            'nested-b-end',
            'nested-c-start',
            'nested-d-start',
            'nested-d-end',
            'nested-c-end',
            'nested-a-end',
            'startTime1',
            'endTime1',
            'startTime2',
            'endTime2',
          ],
      );
    });

    it('correctly orders measures when one measure encapsulates the others', async () => {
      const {timelineModel} = await traceModelFromTraceFile('user-timings-complex.json.gz');
      const userTimingEventNames: string[] = [];
      for (const track of timelineModel.tracks()) {
        if (track.type !== TimelineModel.TimelineModel.TrackType.Timings) {
          continue;
        }
        for (const event of track.asyncEvents) {
          // This trace has multiple user timings events, in this instance we only care about the ones that start with 'duration'
          if (event.hasCategory(TimelineModel.TimelineModel.TimelineModelImpl.Category.UserTiming) &&
              event.name.startsWith('duration')) {
            userTimingEventNames.push(event.name);
          }
        }
      }
      assert.deepEqual(userTimingEventNames, [
        'durationTimeTotal',
        'durationTime1',
        'durationTime2',
      ]);
    });
  });

  describe('style invalidations', () => {
    /**
     * This helper function is very confusing without context. It is designed
     * to work on a trace generated from
     * https://github.com/ChromeDevTools/performance-stories/tree/main/style-invalidations.
     * Those examples are triggered by the user clicking on a button to initiate
     * certain invalidations that we want to test. However, the act of clicking on
     * the button also triggers an invalidation which we do not necessarily want to
     * include in our results. So, instead we look for the invalidations triggered
     * by the test function that was invoked when we clicked the button. Therefore,
     * this function looks through the trace for all UpdateLayoutTree events, and
     * looks for one where the function in the stack trace matches what's expected.
     * We then return all invalidations for that main event.
     **/
    async function invalidationsFromTestFunction(
        timelineModel: TimelineModel.TimelineModel.TimelineModelImpl,
        testFunctionName: string): Promise<TimelineModel.TimelineModel.InvalidationTrackingEvent[]> {
      let mainTrack: TimelineModel.TimelineModel.Track|null = null;
      for (const track of timelineModel.tracks()) {
        if (track.type === TimelineModel.TimelineModel.TrackType.MainThread && track.forMainFrame) {
          mainTrack = track;
        }
      }
      assertNotNullOrUndefined(mainTrack);
      const rootLayoutUpdateEvent = mainTrack.events.find(event => {
        return event.name === TimelineModel.TimelineModel.RecordType.UpdateLayoutTree &&
            event.args.beginData?.stackTrace?.[0].functionName === testFunctionName;
      });
      assertNotNullOrUndefined(rootLayoutUpdateEvent);
      const invalidationsForEvent =
          TimelineModel.TimelineModel.InvalidationTracker.invalidationEventsFor(rootLayoutUpdateEvent);
      assertNotNullOrUndefined(invalidationsForEvent);
      return invalidationsForEvent;
    }

    function invalidationToBasicObject(invalidation: TimelineModel.TimelineModel.InvalidationTrackingEvent) {
      return {
        reason: invalidation.cause.reason,
        nodeName: invalidation.nodeName,
      };
    }

    it('detects the correct invalidations for a class name being changed', async () => {
      const {timelineModel} = await traceModelFromTraceFile('invalidate-style-class-name-change.json.gz');
      const invalidations = await invalidationsFromTestFunction(timelineModel, 'testFuncs.changeClassNameAndDisplay');
      // In this trace there are three nodes impacted by the class name change:
      // the two test divs, and the button, which gains the :active pseudo
      // class
      assert.deepEqual(invalidations.map(invalidationToBasicObject), [
        {
          reason: 'PseudoClass',
          nodeName: 'BUTTON id=\'changeClassNameAndDisplay\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementOne\' class=\'red\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementTwo\' class=\'red\'',
        },
      ]);
    });

    it('detects the correct invalidations for an attribute being changed', async () => {
      const {timelineModel} = await traceModelFromTraceFile('style-invalidation-change-attribute.json.gz');
      const invalidations = await invalidationsFromTestFunction(timelineModel, 'testFuncs.changeAttributeAndDisplay');
      // In this trace there are three nodes impacted by the attribute change:
      // the two test divs, and the button, which gains the :active pseudo
      // class when clicked.
      // However, the two test divs have two invalidations each: one for the attribute, and one for having a pending invalidation list
      assert.deepEqual(invalidations.map(invalidationToBasicObject), [
        {
          reason: 'PseudoClass',
          nodeName: 'BUTTON id=\'changeAttributeAndDisplay\'',
        },
        {
          reason: 'Attribute',
          nodeName: 'DIV id=\'testElementFour\'',
        },
        {
          reason: 'Attribute',
          nodeName: 'DIV id=\'testElementFive\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementFour\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementFive\'',
        },
      ]);
    });
    it('detects the correct invalidations for an ID being changed', async () => {
      const {timelineModel} = await traceModelFromTraceFile('style-invalidation-change-id.json.gz');
      const invalidations = await invalidationsFromTestFunction(timelineModel, 'testFuncs.changeIdAndDisplay');
      // In this trace there are three nodes impacted by the ID change:
      // the two test divs, and the button, which gains the :active pseudo
      // class
      assert.deepEqual(invalidations.map(invalidationToBasicObject), [
        {
          reason: 'PseudoClass',
          nodeName: 'BUTTON id=\'changeIdAndDisplay\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementFour\'',
        },
        {
          reason: 'Element has pending invalidation list',
          nodeName: 'DIV id=\'testElementFive\'',
        },
      ]);
    });
  });

  describe('network events on the track', () => {
    it('provides the expected set of events', async () => {
      const {timelineModel} = await traceModelFromTraceFile('lcp-images.json.gz');
      const requests = timelineModel.networkRequests();
      const urls = requests.map(request => request.url);
      assert.deepEqual(urls, [
        'https://b2607f8b04800100000289cb1c0a82ba72253000000000000000001.proxy.googlers.com/lcp-large-image/',
        'https://fonts.googleapis.com/css2?family=Poppins:ital,wght@1,800',
        'https://b2607f8b04800100000289cb1c0a82ba72253000000000000000001.proxy.googlers.com/lcp-large-image/app.css',
        'https://via.placeholder.com/50.jpg',
        'https://via.placeholder.com/3000.jpg',
      ]);
    });
  });

  function getAllTracingModelPayloadEvents(tracingModel: SDK.TracingModel.TracingModel):
      SDK.TracingModel.PayloadEvent[] {
    const allSDKEvents = tracingModel.sortedProcesses().flatMap(process => {
      return process.sortedThreads().flatMap(thread => thread.events().filter(SDK.TracingModel.eventHasPayload));
    });
    return allSDKEvents;
  }

  it('marks an LCP event on the main thread as an LCP Candidate Event', async () => {
    const {timelineModel, tracingModel} = await traceModelFromTraceFile('lcp-images.json.gz');
    const allSDKEvents = getAllTracingModelPayloadEvents(tracingModel);
    const firstLCPEvent = allSDKEvents.find(event => {
      return event.name === TimelineModel.TimelineModel.RecordType.MarkLCPCandidate;
    });

    if (!firstLCPEvent) {
      throw new Error('Could not find LCP event');
    }
    assert.isTrue(timelineModel.isLCPCandidateEvent(firstLCPEvent));
  });

  it('does not mark an LCP event on another frame as an LCP Candidate Event', async () => {
    const {timelineModel, tracingModel} = await traceModelFromTraceFile('multiple-navigations-with-iframes.json.gz');
    const mainFrameID = timelineModel.mainFrameID();
    const allSDKEvents = getAllTracingModelPayloadEvents(tracingModel);

    const firstLCPEventNotOnMainFrame = allSDKEvents.find(event => {
      return event.name === TimelineModel.TimelineModel.RecordType.MarkLCPCandidate && event.args.frame !== mainFrameID;
    });
    if (!firstLCPEventNotOnMainFrame) {
      throw new Error('Could not find LCP event');
    }
    assert.isFalse(timelineModel.isLCPCandidateEvent(firstLCPEventNotOnMainFrame));
  });
});

describe('groupLayoutShiftsIntoClusters', () => {
  it('does not include layout shifts that have recent user input', () => {
    const shiftWithUserInput = makeFakeLayoutShift({
      hadRecentInput: true,
      weightedScoreDelta: 0.01,
      startTime: 2000,
    });
    const layoutShifts: SDK.TracingModel.Event[] = [shiftWithUserInput];
    TimelineModel.TimelineModel.assignLayoutShiftsToClusters(layoutShifts);
    assert.isUndefined(shiftWithUserInput.args.data._current_cluster_id);
  });

  it('does not include layout shifts that have no weighted_score_delta', () => {
    const shiftWithNoWeightedScore = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: undefined,
      startTime: 2000,
    });
    const layoutShifts: SDK.TracingModel.Event[] = [shiftWithNoWeightedScore];
    TimelineModel.TimelineModel.assignLayoutShiftsToClusters(layoutShifts);
    assert.isUndefined(shiftWithNoWeightedScore.args.data._current_cluster_id);
  });

  it('correctly combines events that are within the same session', () => {
    const shiftOne = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: 0.01,
      startTime: 2000,
    });

    const shiftTwo = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: 0.02,
      startTime: shiftOne.startTime + 100,
    });
    const layoutShifts: SDK.TracingModel.Event[] = [shiftOne, shiftTwo];
    TimelineModel.TimelineModel.assignLayoutShiftsToClusters(layoutShifts);

    assert.strictEqual(shiftOne.args.data._current_cluster_id, 1);
    assert.strictEqual(shiftTwo.args.data._current_cluster_id, 1);
    assert.strictEqual(shiftOne.args.data._current_cluster_score, 0.03);
    assert.strictEqual(shiftTwo.args.data._current_cluster_score, 0.03);
  });

  it('correctly splits events into multiple clusters', () => {
    const shiftOne = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: 0.01,
      startTime: 2000,
    });

    const shiftTwo = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: 0.02,
      startTime: shiftOne.startTime + 100,
    });

    const shiftThree = makeFakeLayoutShift({
      hadRecentInput: false,
      weightedScoreDelta: 0.05,
      startTime: 10000,
    });

    const layoutShifts: SDK.TracingModel.Event[] = [shiftOne, shiftTwo, shiftThree];
    TimelineModel.TimelineModel.assignLayoutShiftsToClusters(layoutShifts);

    assert.strictEqual(shiftOne.args.data._current_cluster_id, 1);
    assert.strictEqual(shiftTwo.args.data._current_cluster_id, 1);
    assert.strictEqual(shiftOne.args.data._current_cluster_score, 0.03);
    assert.strictEqual(shiftTwo.args.data._current_cluster_score, 0.03);

    assert.strictEqual(shiftThree.args.data._current_cluster_id, 2);
    assert.strictEqual(shiftThree.args.data._current_cluster_score, 0.05);
  });
});
