// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Elements from '../../../../../front_end/panels/elements/elements.js';
import * as ObjectUI from '../../../../../front_end/ui/legacy/components/object_ui/object_ui.js';
import * as UI from '../../../../../front_end/ui/legacy/legacy.js';

import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget, stubNoopSettings} from '../../helpers/EnvironmentHelpers.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import {describeWithMockConnection, setMockConnectionResponseHandler} from '../../helpers/MockConnection.js';

const {assert} = chai;

const NODE_ID = 1 as Protocol.DOM.NodeId;

describeWithMockConnection('PropertiesWidget', () => {
  let target: SDK.Target.Target;
  let view: Elements.PropertiesWidget.PropertiesWidget;

  beforeEach(() => {
    stubNoopSettings();
    target = createTarget();
    setMockConnectionResponseHandler('DOM.getDocument', () => ({root: {nodeId: NODE_ID}}));
    setMockConnectionResponseHandler('DOM.getNodesForSubtreeByStyle', () => ({nodeIds: []}));
  });

  afterEach(() => {
    view.detach();
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatesUiOnEvent = (event: any, inScope: boolean) => async () => {
    if (inScope) {
      SDK.TargetManager.TargetManager.instance().setScopeTarget(target);
    }
    const model = target.model(SDK.DOMModel.DOMModel);
    assertNotNullOrUndefined(model);

    const node = new SDK.DOMModel.DOMNode(model);
    sinon.stub(node, 'resolveToObject').withArgs('properties-sidebar-pane').resolves({
      getAllProperties: () => ({}),
      getOwnProperties: () => ({}),
    } as unknown as SDK.RemoteObject.RemoteObject);
    UI.Context.Context.instance().setFlavor(SDK.DOMModel.DOMNode, node);

    view = Elements.PropertiesWidget.PropertiesWidget.instance({forceNew: true, throttlingTimeout: 0});
    view.markAsRoot();
    view.show(document.body);
    await new Promise<void>(resolve => setTimeout(resolve, 0));

    const populateWithProperties =
        sinon.spy(ObjectUI.ObjectPropertiesSection.ObjectPropertyTreeElement, 'populateWithProperties');
    model.dispatchEventToListeners(event, node);
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    assert.strictEqual(populateWithProperties.called, inScope);
  };

  it('updates UI on in scope attribute modified event', updatesUiOnEvent(SDK.DOMModel.Events.AttrModified, true));
  it('does not update UI on out of scope attribute modified event',
     updatesUiOnEvent(SDK.DOMModel.Events.AttrModified, false));
  it('updates UI on in scope attribute removed event', updatesUiOnEvent(SDK.DOMModel.Events.AttrRemoved, true));
  it('does not update UI on out of scope attribute removed event',
     updatesUiOnEvent(SDK.DOMModel.Events.AttrModified, false));
  it('updates UI on in scope charachter data modified event',
     updatesUiOnEvent(SDK.DOMModel.Events.CharacterDataModified, true));
  it('does not update UI on out of scope charachter data modified event',
     updatesUiOnEvent(SDK.DOMModel.Events.CharacterDataModified, false));
  it('updates UI on in scope child node count updated event',
     updatesUiOnEvent(SDK.DOMModel.Events.ChildNodeCountUpdated, true));
  it('does not update UI on out of scope child node count updated event',
     updatesUiOnEvent(SDK.DOMModel.Events.ChildNodeCountUpdated, false));
});
