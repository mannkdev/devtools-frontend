// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as FrontendHelpers from '../../../../../test/unittests/front_end/helpers/TraceHelpers.js';
import * as TimelineModel from '../../../../models/timeline_model/timeline_model.js';
import * as Timeline from '../../../../panels/timeline/timeline.js';
import * as ComponentSetup from '../../helpers/helpers.js';

import type * as PerfUI from '../../../legacy/components/perf_ui/perf_ui.js';
await ComponentSetup.ComponentServerSetup.setup();

const params = new URLSearchParams(window.location.search);
const track = params.get('track');
const fileName = params.get('fileName');
const p = document.createElement('p');
await renderContent();

type FlameChartData = {
  flameChart: PerfUI.FlameChart.FlameChart,
  dataProvider: Timeline.TimelineFlameChartDataProvider.TimelineFlameChartDataProvider,
};
async function renderContent() {
  const container = document.getElementById('container');
  if (!container) {
    throw new Error('could not find container');
  }
  container.appendChild(p);
  if (!track || !fileName) {
    document.title = 'Performance panel track example';
    p.innerText =
        'Use the `track` and `fileName` URL search params to load a track example (f.e. track_example.html?track=Timings&fileName=timings-track)';
    return;
  }
  const file = `${fileName}.json.gz`;
  document.title = `Performance panel ${track} track`;
  p.innerText = `${track} track is loading`;
  p.classList.add('loading');
  let flameChartData: FlameChartData;
  try {
    // @ts-expect-error: allow to check if a const string array contains a string.
    if (Timeline.CompatibilityTracksAppender.TrackNames.includes(track)) {
      const trackAppenderName = track as Timeline.CompatibilityTracksAppender.TrackAppenderName;
      flameChartData = await FrontendHelpers.getMainFlameChartWithTracks(file, new Set([trackAppenderName]));
    } else if (track in TimelineModel.TimelineModel.TrackType) {
      flameChartData =
          await FrontendHelpers.getMainFlameChartWithLegacyTrack(file, track as TimelineModel.TimelineModel.TrackType);
    } else {
      p.classList.remove('loading');
      p.innerText = `Invalid track name: ${track}`;
      return;
    }
    container.innerHTML = '';
    const {flameChart, dataProvider} = flameChartData;
    const timingsTrackOffset = flameChart.levelToOffset(dataProvider.maxStackDepth());
    container.style.height = `${timingsTrackOffset}px`;
    flameChart.show(container);
  } catch (error) {
    p.classList.remove('loading');
    p.innerText = error;
  }
}
