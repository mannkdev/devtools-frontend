// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  dispatchEvent,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';

const {assert} = chai;

function navigateFrameWithMockConnection(
    storageKey: string, resourceTreeModel: SDK.ResourceTreeModel.ResourceTreeModel|null) {
  setMockConnectionResponseHandler('Storage.getStorageKeyForFrame', () => ({storageKey}));
  resourceTreeModel?.frameNavigated(
      {
        id: 'main',
        loaderId: 'foo',
        url: 'http://example.com',
        securityOrigin: 'http://example.com',
        mimeType: 'text/html',
      } as Protocol.Page.Frame,
      undefined,
  );
}

describeWithMockConnection('ResourceTreeModel', () => {
  let beforeGetResourceTree = Promise.resolve();

  beforeEach(async () => {
    setMockConnectionResponseHandler('Page.getResourceTree', async () => {
      await beforeGetResourceTree;
      return {
        frameTree: {
          frame: {
            id: 'main',
            loaderId: 'test',
            url: 'http://example.com',
            securityOrigin: 'http://example.com',
            mimeType: 'text/html',
          },
          resources: [],
        },
      };
    });
  });

  it('calls clearRequests on reloadPage', () => {
    const target = createTarget();
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assertNotNullOrUndefined(resourceTreeModel);
    assertNotNullOrUndefined(networkManager);
    const clearRequests = sinon.stub(networkManager, 'clearRequests');
    resourceTreeModel.reloadPage();
    assert.isTrue(clearRequests.calledOnce, 'Not called just once');
  });

  function frameNavigatedEvent(parentId?: string, id?: string) {
    return {
      frame: {
        id: id ?? 'main',
        parentId,
        loaderId: 'foo',
        url: 'http://example.com',
        domainAndRegistry: 'example.com',
        securityOrigin: 'http://example.com',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    };
  }

  it('calls clearRequests on top frame navigated', () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assertNotNullOrUndefined(networkManager);
    const clearRequests = sinon.stub(networkManager, 'clearRequests');
    dispatchEvent(target, 'Page.frameNavigated', frameNavigatedEvent());
    assert.isTrue(clearRequests.calledOnce, 'Not called just once');
  });

  it('does not call clearRequests on non-top frame navigated', () => {
    const target = createTarget();
    const networkManager = target.model(SDK.NetworkManager.NetworkManager);
    assertNotNullOrUndefined(networkManager);
    const clearRequests = sinon.stub(networkManager, 'clearRequests');
    dispatchEvent(target, 'Page.frameNavigated', frameNavigatedEvent('parentId'));
    assert.isTrue(clearRequests.notCalled, 'Called unexpctedly');
  });

  it('records prerenderingStatus', () => {
    const target = createTarget();
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    dispatchEvent(target, 'Page.frameNavigated', frameNavigatedEvent());
    dispatchEvent(
        target,
        'Preload.prerenderAttemptCompleted',
        {
          'initiatingFrameId': 'main',
          'prerenderingUrl': 'http://example.com/page.html',
          'finalStatus': Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed,
        },
    );
    dispatchEvent(
        target,
        'Preload.prerenderAttemptCompleted',
        {
          'initiatingFrameId': 'next',
          'prerenderingUrl': 'http://example.com/page.html',
          'finalStatus': Protocol.Preload.PrerenderFinalStatus.ClientCertRequested,
        },
    );
    assertNotNullOrUndefined(resourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel.mainFrame);
    assert.strictEqual(
        resourceTreeModel.mainFrame.prerenderFinalStatus, Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed);
    dispatchEvent(target, 'Page.frameNavigated', frameNavigatedEvent(undefined, 'next'));
    assertNotNullOrUndefined(resourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel.mainFrame);
    assert.strictEqual(
        resourceTreeModel.mainFrame.prerenderFinalStatus, Protocol.Preload.PrerenderFinalStatus.ClientCertRequested);
  });
  describe('prerender event before getResourceTree', () => {
    let resolveGetResourceTree: () => void;
    before(() => {
      beforeGetResourceTree = new Promise(resolve => {
        resolveGetResourceTree = resolve;
      });
    });

    it('process prending event', async () => {
      const target = createTarget();
      const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
      dispatchEvent(
          target,
          'Preload.prerenderAttemptCompleted',
          {
            'initiatingFrameId': 'main',
            'prerenderingUrl': 'http://example.com/page.html',
            'finalStatus': Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed,
          },
      );
      assertNotNullOrUndefined(resourceTreeModel);
      assert.isNull(resourceTreeModel.mainFrame);
      resolveGetResourceTree();
      await new Promise(resolve => {
        resourceTreeModel?.addEventListener(SDK.ResourceTreeModel.Events.FrameAdded, resolve);
      });
      assertNotNullOrUndefined(resourceTreeModel.mainFrame);
      assert.strictEqual(
          resourceTreeModel.mainFrame.prerenderFinalStatus, Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed);
    });
  });

  it('records prerendering disallowedApiMethod', () => {
    const target = createTarget();
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    dispatchEvent(target, 'Page.frameNavigated', {
      frame: {
        id: 'main',
        loaderId: 'foo',
        url: 'http://example.com',
        domainAndRegistry: 'example.com',
        securityOrigin: 'http://example.com',
        mimeType: 'text/html',
        secureContextType: Protocol.Page.SecureContextType.Secure,
        crossOriginIsolatedContextType: Protocol.Page.CrossOriginIsolatedContextType.Isolated,
        gatedAPIFeatures: [],
      },
    });
    dispatchEvent(
        target,
        'Preload.prerenderAttemptCompleted',
        {
          'initiatingFrameId': 'main',
          'prerenderingUrl': 'http://example.com/page.html',
          'finalStatus': Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
          'disallowedApiMethod': 'device.mojom.GamepadMonitor',
        },
    );

    assertNotNullOrUndefined(resourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel.mainFrame);
    assert.strictEqual(
        resourceTreeModel.mainFrame.prerenderFinalStatus, Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy);
    assert.strictEqual(resourceTreeModel.mainFrame.prerenderDisallowedApiMethod, 'device.mojom.GamepadMonitor');
  });

  it('added frame has storageKey when navigated', async () => {
    const testKey = 'test-storage-key';

    const resourceTreeModel = createTarget().model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.isEmpty(resourceTreeModel?.frames());
    navigateFrameWithMockConnection(testKey, resourceTreeModel);
    const frames = resourceTreeModel?.frames();
    assertNotNullOrUndefined(frames);
    assert.lengthOf(frames, 1);
    const addedFrame = frames[0];
    assertNotNullOrUndefined(addedFrame);
    const key = await addedFrame.getStorageKey(false);
    assertNotNullOrUndefined(key);
    assert.strictEqual(key, testKey);
  });

  it('storage key gets updated when frame tree changes', async () => {
    const testKey = 'test-storage-key';

    const target = createTarget();
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.isEmpty(resourceTreeModel?.frames());
    const manager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    assertNotNullOrUndefined(manager);
    const storageKeyAddedPromise = new Promise<void>(resolve => {
      manager.addEventListener(SDK.StorageKeyManager.Events.StorageKeyAdded, () => {
        resolve();
      });
    });
    navigateFrameWithMockConnection(testKey, resourceTreeModel);
    await storageKeyAddedPromise;
    assert.strictEqual(resourceTreeModel?.frames().length, 1);

    const mainStorageKeyChangedPromise = new Promise<void>(resolve => {
      manager.addEventListener(SDK.StorageKeyManager.Events.MainStorageKeyChanged, () => {
        resolve();
      });
    });
    const storageKeyRemovedPromise = new Promise<void>(resolve => {
      manager.addEventListener(SDK.StorageKeyManager.Events.StorageKeyRemoved, () => {
        resolve();
      });
    });

    resourceTreeModel?.frameDetached('main' as Protocol.Page.FrameId, false);
    assert.isEmpty(resourceTreeModel?.frames());
    await Promise.all([mainStorageKeyChangedPromise, storageKeyRemovedPromise]);
  });

  function getResourceTeeModel(target: SDK.Target.Target): SDK.ResourceTreeModel.ResourceTreeModel {
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);
    return resourceTreeModel;
  }

  it('calls reloads only top frames without tab target', () => {
    const mainFrameTarget = createTarget();
    const subframeTarget = createTarget({parentTarget: mainFrameTarget});
    const reloadMainFramePage = sinon.spy(getResourceTeeModel(mainFrameTarget), 'reloadPage');
    const reloadSubframePage = sinon.spy(getResourceTeeModel(subframeTarget), 'reloadPage');
    SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages();

    assert.isTrue(reloadMainFramePage.calledOnce);
    assert.isTrue(reloadSubframePage.notCalled);
  });

  it('calls reloads only top frames with tab target', () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const mainFrameTarget = createTarget({parentTarget: tabTarget});
    const subframeTarget = createTarget({parentTarget: mainFrameTarget});
    const reloadMainFramePage = sinon.spy(getResourceTeeModel(mainFrameTarget), 'reloadPage');
    const reloadSubframePage = sinon.spy(getResourceTeeModel(subframeTarget), 'reloadPage');
    SDK.ResourceTreeModel.ResourceTreeModel.reloadAllPages();

    assert.isTrue(reloadMainFramePage.calledOnce);
    assert.isTrue(reloadSubframePage.notCalled);
  });

  it('identifies top frame without tab target', async () => {
    const mainFrameTarget = createTarget();
    const subframeTarget = createTarget({parentTarget: mainFrameTarget});

    dispatchEvent(mainFrameTarget, 'Page.frameNavigated', frameNavigatedEvent());
    dispatchEvent(subframeTarget, 'Page.frameNavigated', frameNavigatedEvent('parentId'));
    assert.isTrue(getResourceTeeModel(mainFrameTarget).mainFrame?.isOutermostFrame());
    assertNotNullOrUndefined(getResourceTeeModel(subframeTarget));
    assert.isFalse(getResourceTeeModel(subframeTarget).mainFrame?.isOutermostFrame());
  });

  it('identifies not top frame with tab target', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const mainFrameTarget = createTarget({parentTarget: tabTarget});
    const subframeTarget = createTarget({parentTarget: mainFrameTarget});

    dispatchEvent(mainFrameTarget, 'Page.frameNavigated', frameNavigatedEvent());
    dispatchEvent(subframeTarget, 'Page.frameNavigated', frameNavigatedEvent('parentId'));
    assert.isTrue(getResourceTeeModel(mainFrameTarget).mainFrame?.isOutermostFrame());
    assertNotNullOrUndefined(getResourceTeeModel(subframeTarget));
    assert.isFalse(getResourceTeeModel(subframeTarget).mainFrame?.isOutermostFrame());
  });

  it('emits PrimaryPageChanged event upon prerender activation', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const childTargetManager = tabTarget.model(SDK.ChildTargetManager.ChildTargetManager);
    assertNotNullOrUndefined(childTargetManager);

    const targetId = 'target_id' as Protocol.Target.TargetID;
    const targetInfo = {
      targetId,
      type: 'page',
      title: 'title',
      url: 'http://example.com/prerendered.html',
      attached: true,
      canAccessOpener: false,
      subtype: 'prerender',
    };
    childTargetManager.targetCreated({targetInfo});
    await childTargetManager.attachedToTarget(
        {sessionId: 'session_id' as Protocol.Target.SessionID, targetInfo, waitingForDebugger: false});

    const prerenderTarget = SDK.TargetManager.TargetManager.instance().targetById(targetId);
    assertNotNullOrUndefined(prerenderTarget);
    const resourceTreeModel = prerenderTarget.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assertNotNullOrUndefined(resourceTreeModel);

    const primaryPageChangedEvents:
        {frame: SDK.ResourceTreeModel.ResourceTreeFrame, type: SDK.ResourceTreeModel.PrimaryPageChangeType}[] = [];
    resourceTreeModel.addEventListener(
        SDK.ResourceTreeModel.Events.PrimaryPageChanged, event => primaryPageChangedEvents.push(event.data));

    const frame = resourceTreeModel.frameAttached('frame_id' as Protocol.Page.FrameId, null);
    childTargetManager.targetInfoChanged({targetInfo: {...targetInfo, subtype: undefined}});

    assert.strictEqual(primaryPageChangedEvents.length, 1);
    assert.strictEqual(primaryPageChangedEvents[0].frame, frame);
    assert.strictEqual(primaryPageChangedEvents[0].type, SDK.ResourceTreeModel.PrimaryPageChangeType.Activation);
  });

  it('emits PrimaryPageChanged event only upon navigation of the primary frame', async () => {
    const tabTarget = createTarget({type: SDK.Target.Type.Tab});
    const mainFrameTarget = createTarget({parentTarget: tabTarget});
    const subframeTarget = createTarget({parentTarget: mainFrameTarget});
    const prerenderTarget = createTarget({parentTarget: tabTarget, subtype: 'prerender'});

    const primaryPageChangedEvents:
        {frame: SDK.ResourceTreeModel.ResourceTreeFrame, type: SDK.ResourceTreeModel.PrimaryPageChangeType}[] = [];

    [getResourceTeeModel(mainFrameTarget), getResourceTeeModel(subframeTarget), getResourceTeeModel(prerenderTarget)]
        .forEach(resourceTreeModel => {
          resourceTreeModel.addEventListener(
              SDK.ResourceTreeModel.Events.PrimaryPageChanged, event => primaryPageChangedEvents.push(event.data));
        });

    dispatchEvent(mainFrameTarget, 'Page.frameNavigated', frameNavigatedEvent());
    assert.strictEqual(primaryPageChangedEvents.length, 1);
    assert.strictEqual(primaryPageChangedEvents[0].frame.id, 'main');
    assert.strictEqual(primaryPageChangedEvents[0].type, SDK.ResourceTreeModel.PrimaryPageChangeType.Navigation);

    dispatchEvent(subframeTarget, 'Page.frameNavigated', frameNavigatedEvent('main', 'child'));
    assert.strictEqual(primaryPageChangedEvents.length, 1);

    dispatchEvent(prerenderTarget, 'Page.frameNavigated', frameNavigatedEvent());
    assert.strictEqual(primaryPageChangedEvents.length, 1);
  });
});
