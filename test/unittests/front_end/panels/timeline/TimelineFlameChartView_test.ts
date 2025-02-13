// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Timeline from '../../../../../front_end/panels/timeline/timeline.js';
import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';
import {describeWithEnvironment} from '../../helpers/EnvironmentHelpers.js';
import {allModelsFromFile} from '../../helpers/TraceHelpers.js';

const {assert} = chai;

class MockViewDelegate implements Timeline.TimelinePanel.TimelineModeViewDelegate {
  selection: Timeline.TimelinePanel.TimelineSelection|null = null;
  select(selection: Timeline.TimelinePanel.TimelineSelection|null): void {
    this.selection = selection;
  }
  selectEntryAtTime(_events: SDK.TracingModel.Event[]|null, _time: number): void {
  }
  highlightEvent(_event: SDK.TracingModel.Event|null): void {
  }
}
describeWithEnvironment('TimelineFlameChartView', () => {
  it('Can search for events by name in the timeline', async () => {
    const {traceParsedData, performanceModel} = await allModelsFromFile('lcp-images.json.gz');
    // The timeline flamechart view will invoke the `select` method
    // of this delegate every time an event has matched on a search.
    const mockViewDelegate = new MockViewDelegate();

    const flameChartView = new Timeline.TimelineFlameChartView.TimelineFlameChartView(mockViewDelegate);
    const searchableView = new UI.SearchableView.SearchableView(flameChartView, null);
    flameChartView.setSearchableView(searchableView);
    flameChartView.setModel(performanceModel, traceParsedData);

    const searchQuery = 'Paint';
    const searchConfig =
        new UI.SearchableView.SearchConfig(/* query */ searchQuery, /* caseSensitive */ false, /* isRegex */ false);
    flameChartView.performSearch(searchConfig, true);

    assert.strictEqual(flameChartView.getSearchResults()?.length, 23);
    assertSelectionName('PrePaint');

    flameChartView.jumpToNextSearchResult();
    assertSelectionName('Paint');

    flameChartView.jumpToNextSearchResult();
    assertSelectionName('PaintImage');

    flameChartView.jumpToPreviousSearchResult();
    assertSelectionName('Paint');

    function assertSelectionName(name: string) {
      const selection = mockViewDelegate.selection;
      assert.isNotNull(selection);
      assert.strictEqual(selection?.type(), 'TraceEvent');
      const object = selection?.object?.();
      if (!object || !('name' in object)) {
        throw new Error('Trace event not found or did not have a name.');
      }
      assert.strictEqual(object.name, name);
    }
  });
});
