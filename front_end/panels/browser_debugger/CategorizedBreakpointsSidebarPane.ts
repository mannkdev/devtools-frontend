// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

import categorizedBreakpointsSidebarPaneStyles from './categorizedBreakpointsSidebarPane.css.js';

import type * as Protocol from '../../generated/protocol.js';

const UIStrings = {
  /**
   *@description Screen reader description of a hit breakpoint in the Sources panel
   */
  breakpointHit: 'breakpoint hit',
};
const str_ = i18n.i18n.registerUIStrings('panels/browser_debugger/CategorizedBreakpointsSidebarPane.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export abstract class CategorizedBreakpointsSidebarPane extends UI.Widget.VBox {
  readonly #categoriesTreeOutline: UI.TreeOutline.TreeOutlineInShadow;
  readonly #viewId: string;
  readonly #detailsPausedReason: Protocol.Debugger.PausedEventReason;
  readonly #categories: Map<string, Item>;
  readonly #breakpoints: Map<SDK.CategorizedBreakpoint.CategorizedBreakpoint, Item>;
  #highlightedElement?: HTMLLIElement;
  constructor(
      categories: string[], breakpoints: SDK.CategorizedBreakpoint.CategorizedBreakpoint[], viewId: string,
      detailsPausedReason: Protocol.Debugger.PausedEventReason) {
    super(true);
    this.#categoriesTreeOutline = new UI.TreeOutline.TreeOutlineInShadow();

    this.#categoriesTreeOutline.setShowSelectionOnKeyboardFocus(/* show */ true);
    this.contentElement.appendChild(this.#categoriesTreeOutline.element);
    this.#viewId = viewId;
    this.#detailsPausedReason = detailsPausedReason;

    this.#categories = new Map();
    for (const category of categories) {
      if (!this.#categories.has(category)) {
        this.createCategory(category);
      }
    }
    if (categories.length > 0) {
      const firstCategory = this.#categories.get(categories[0]);
      if (firstCategory) {
        firstCategory.element.select();
      }
    }

    this.#breakpoints = new Map();
    for (const breakpoint of breakpoints) {
      this.createBreakpoint(breakpoint);
    }

    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerPaused, this.update, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.DebuggerModel.DebuggerModel, SDK.DebuggerModel.Events.DebuggerResumed, this.update, this);
    UI.Context.Context.instance().addFlavorChangeListener(SDK.Target.Target, this.update, this);
  }

  get categories(): Map<string, Item> {
    return this.#categories;
  }

  get breakpoints(): Map<SDK.CategorizedBreakpoint.CategorizedBreakpoint, Item> {
    return this.#breakpoints;
  }

  focus(): void {
    this.#categoriesTreeOutline.forceSelect();
  }

  private handleSpaceKeyEventOnBreakpoint(event: KeyboardEvent, breakpoint?: Item): void {
    if (event && event.key === ' ') {
      if (breakpoint) {
        breakpoint.checkbox.click();
      }
      event.consume(true);
    }
  }

  private createCategory(name: string): void {
    const labelNode = UI.UIUtils.CheckboxLabel.create(name);
    labelNode.checkboxElement.addEventListener('click', this.categoryCheckboxClicked.bind(this, name), true);
    labelNode.checkboxElement.tabIndex = -1;

    const treeElement = new UI.TreeOutline.TreeElement(labelNode);
    treeElement.listItemElement.addEventListener('keydown', event => {
      this.handleSpaceKeyEventOnBreakpoint(event, this.#categories.get(name));
    });

    labelNode.checkboxElement.addEventListener('keydown', event => {
      treeElement.listItemElement.focus();
      this.handleSpaceKeyEventOnBreakpoint(event, this.#categories.get(name));
    });

    UI.ARIAUtils.setChecked(treeElement.listItemElement, false);
    this.#categoriesTreeOutline.appendChild(treeElement);

    this.#categories.set(name, {element: treeElement, checkbox: labelNode.checkboxElement});
  }

  protected createBreakpoint(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint): void {
    const labelNode = UI.UIUtils.CheckboxLabel.create(breakpoint.title());
    labelNode.classList.add('source-code');
    labelNode.checkboxElement.addEventListener('click', this.breakpointCheckboxClicked.bind(this, breakpoint), true);
    labelNode.checkboxElement.tabIndex = -1;

    const treeElement = new UI.TreeOutline.TreeElement(labelNode);
    treeElement.listItemElement.addEventListener('keydown', event => {
      this.handleSpaceKeyEventOnBreakpoint(event, this.#breakpoints.get(breakpoint));
    });

    labelNode.checkboxElement.addEventListener('keydown', event => {
      treeElement.listItemElement.focus();
      this.handleSpaceKeyEventOnBreakpoint(event, this.#breakpoints.get(breakpoint));
    });

    UI.ARIAUtils.setChecked(treeElement.listItemElement, false);
    treeElement.listItemElement.createChild('div', 'breakpoint-hit-marker');
    const category = this.#categories.get(breakpoint.category());
    if (category) {
      category.element.appendChild(treeElement);
    }
    // Better to return that to produce a side-effect
    this.#breakpoints.set(breakpoint, {element: treeElement, checkbox: labelNode.checkboxElement});
  }

  protected getBreakpointFromPausedDetails(_details: SDK.DebuggerModel.DebuggerPausedDetails):
      SDK.CategorizedBreakpoint.CategorizedBreakpoint|null {
    return null;
  }

  private update(): void {
    const target = UI.Context.Context.instance().flavor(SDK.Target.Target);
    const debuggerModel = target ? target.model(SDK.DebuggerModel.DebuggerModel) : null;
    const details = debuggerModel ? debuggerModel.debuggerPausedDetails() : null;

    if (!details || details.reason !== this.#detailsPausedReason || !details.auxData) {
      if (this.#highlightedElement) {
        UI.ARIAUtils.setDescription(this.#highlightedElement, '');
        this.#highlightedElement.classList.remove('breakpoint-hit');
        this.#highlightedElement = undefined;
      }
      return;
    }
    const breakpoint = this.getBreakpointFromPausedDetails(details);
    if (!breakpoint) {
      return;
    }

    void UI.ViewManager.ViewManager.instance().showView(this.#viewId);
    const category = this.#categories.get(breakpoint.category());
    if (category) {
      category.element.expand();
    }
    const matchingBreakpoint = this.#breakpoints.get(breakpoint);
    if (matchingBreakpoint) {
      this.#highlightedElement = matchingBreakpoint.element.listItemElement;
      UI.ARIAUtils.setDescription(this.#highlightedElement, i18nString(UIStrings.breakpointHit));
      this.#highlightedElement.classList.add('breakpoint-hit');
    }
  }

  // Probably can be kept although eventListener does not call this._breakpointCheckboxClicke
  private categoryCheckboxClicked(category: string): void {
    const item = this.#categories.get(category);
    if (!item) {
      return;
    }

    const enabled = item.checkbox.checked;
    UI.ARIAUtils.setChecked(item.element.listItemElement, enabled);

    for (const [breakpoint, treeItem] of this.#breakpoints) {
      if (breakpoint.category() === category) {
        const matchingBreakpoint = this.#breakpoints.get(breakpoint);
        if (matchingBreakpoint) {
          matchingBreakpoint.checkbox.checked = enabled;
          this.toggleBreakpoint(breakpoint, enabled);
          UI.ARIAUtils.setChecked(treeItem.element.listItemElement, enabled);
        }
      }
    }
  }

  protected toggleBreakpoint(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint, enabled: boolean): void {
    breakpoint.setEnabled(enabled);
  }

  private breakpointCheckboxClicked(breakpoint: SDK.CategorizedBreakpoint.CategorizedBreakpoint): void {
    const item = this.#breakpoints.get(breakpoint);
    if (!item) {
      return;
    }

    this.toggleBreakpoint(breakpoint, item.checkbox.checked);
    UI.ARIAUtils.setChecked(item.element.listItemElement, item.checkbox.checked);

    // Put the rest in a separate function
    let hasEnabled = false;
    let hasDisabled = false;
    for (const other of this.#breakpoints.keys()) {
      if (other.category() === breakpoint.category()) {
        if (other.enabled()) {
          hasEnabled = true;
        } else {
          hasDisabled = true;
        }
      }
    }

    const category = this.#categories.get(breakpoint.category());
    if (!category) {
      return;
    }
    category.checkbox.checked = hasEnabled;
    category.checkbox.indeterminate = hasEnabled && hasDisabled;
    if (category.checkbox.indeterminate) {
      UI.ARIAUtils.setCheckboxAsIndeterminate(category.element.listItemElement);
    } else {
      UI.ARIAUtils.setChecked(category.element.listItemElement, hasEnabled);
    }
  }
  wasShown(): void {
    super.wasShown();
    this.#categoriesTreeOutline.registerCSSFiles([categorizedBreakpointsSidebarPaneStyles]);
  }
}
export interface Item {
  element: UI.TreeOutline.TreeElement;
  checkbox: HTMLInputElement;
}
