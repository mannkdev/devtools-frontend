interface ChangedRange {
    fromA: number;
    toA: number;
    fromB: number;
    toB: number;
}
declare class TreeFragment {
    readonly from: number;
    readonly to: number;
    readonly tree: Tree;
    readonly offset: number;
    constructor(from: number, to: number, tree: Tree, offset: number, openStart?: boolean, openEnd?: boolean);
    get openStart(): boolean;
    get openEnd(): boolean;
    static addTree(tree: Tree, fragments?: readonly TreeFragment[], partial?: boolean): TreeFragment[];
    static applyChanges(fragments: readonly TreeFragment[], changes: readonly ChangedRange[], minGap?: number): readonly TreeFragment[];
}
interface PartialParse {
    advance(): Tree | null;
    readonly parsedPos: number;
    stopAt(pos: number): void;
    readonly stoppedAt: number | null;
}
declare abstract class Parser {
    abstract createParse(input: Input, fragments: readonly TreeFragment[], ranges: readonly {
        from: number;
        to: number;
    }[]): PartialParse;
    startParse(input: Input | string, fragments?: readonly TreeFragment[], ranges?: readonly {
        from: number;
        to: number;
    }[]): PartialParse;
    parse(input: Input | string, fragments?: readonly TreeFragment[], ranges?: readonly {
        from: number;
        to: number;
    }[]): Tree;
}
interface Input {
    readonly length: number;
    chunk(from: number): string;
    readonly lineChunks: boolean;
    read(from: number, to: number): string;
}
type ParseWrapper = (inner: PartialParse, input: Input, fragments: readonly TreeFragment[], ranges: readonly {
    from: number;
    to: number;
}[]) => PartialParse;

declare class NodeProp<T> {
    perNode: boolean;
    deserialize: (str: string) => T;
    constructor(config?: {
        deserialize?: (str: string) => T;
        perNode?: boolean;
    });
    add(match: {
        [selector: string]: T;
    } | ((type: NodeType) => T | undefined)): NodePropSource;
    static closedBy: NodeProp<readonly string[]>;
    static openedBy: NodeProp<readonly string[]>;
    static group: NodeProp<readonly string[]>;
    static contextHash: NodeProp<number>;
    static lookAhead: NodeProp<number>;
    static mounted: NodeProp<MountedTree>;
}
declare class MountedTree {
    readonly tree: Tree;
    readonly overlay: readonly {
        from: number;
        to: number;
    }[] | null;
    readonly parser: Parser;
    constructor(tree: Tree, overlay: readonly {
        from: number;
        to: number;
    }[] | null, parser: Parser);
}
type NodePropSource = (type: NodeType) => null | [NodeProp<any>, any];
declare class NodeType {
    readonly name: string;
    readonly id: number;
    static define(spec: {
        id: number;
        name?: string;
        props?: readonly ([NodeProp<any>, any] | NodePropSource)[];
        top?: boolean;
        error?: boolean;
        skipped?: boolean;
    }): NodeType;
    prop<T>(prop: NodeProp<T>): T | undefined;
    get isTop(): boolean;
    get isSkipped(): boolean;
    get isError(): boolean;
    get isAnonymous(): boolean;
    is(name: string | number): boolean;
    static none: NodeType;
    static match<T>(map: {
        [selector: string]: T;
    }): (node: NodeType) => T | undefined;
}
declare class NodeSet {
    readonly types: readonly NodeType[];
    constructor(types: readonly NodeType[]);
    extend(...props: NodePropSource[]): NodeSet;
}
declare enum IterMode {
    ExcludeBuffers = 1,
    IncludeAnonymous = 2,
    IgnoreMounts = 4,
    IgnoreOverlays = 8
}
declare class Tree {
    readonly type: NodeType;
    readonly children: readonly (Tree | TreeBuffer)[];
    readonly positions: readonly number[];
    readonly length: number;
    constructor(type: NodeType, children: readonly (Tree | TreeBuffer)[], positions: readonly number[], length: number, props?: readonly [NodeProp<any> | number, any][]);
    static empty: Tree;
    cursor(mode?: IterMode): TreeCursor;
    cursorAt(pos: number, side?: -1 | 0 | 1, mode?: IterMode): TreeCursor;
    get topNode(): SyntaxNode;
    resolve(pos: number, side?: -1 | 0 | 1): SyntaxNode;
    resolveInner(pos: number, side?: -1 | 0 | 1): SyntaxNode;
    iterate(spec: {
        enter(node: SyntaxNodeRef): boolean | void;
        leave?(node: SyntaxNodeRef): void;
        from?: number;
        to?: number;
        mode?: IterMode;
    }): void;
    prop<T>(prop: NodeProp<T>): T | undefined;
    get propValues(): readonly [NodeProp<any> | number, any][];
    balance(config?: {
        makeTree?: (children: readonly (Tree | TreeBuffer)[], positions: readonly number[], length: number) => Tree;
    }): Tree;
    static build(data: BuildData): Tree;
}
type BuildData = {
    buffer: BufferCursor | readonly number[];
    nodeSet: NodeSet;
    topID: number;
    start?: number;
    bufferStart?: number;
    length?: number;
    maxBufferLength?: number;
    reused?: readonly Tree[];
    minRepeatType?: number;
};
interface BufferCursor {
    pos: number;
    id: number;
    start: number;
    end: number;
    size: number;
    next(): void;
    fork(): BufferCursor;
}
declare class TreeBuffer {
    readonly buffer: Uint16Array;
    readonly length: number;
    readonly set: NodeSet;
    constructor(buffer: Uint16Array, length: number, set: NodeSet);
}
interface SyntaxNodeRef {
    readonly from: number;
    readonly to: number;
    readonly type: NodeType;
    readonly name: string;
    readonly tree: Tree | null;
    readonly node: SyntaxNode;
    matchContext(context: readonly string[]): boolean;
}
interface SyntaxNode extends SyntaxNodeRef {
    parent: SyntaxNode | null;
    firstChild: SyntaxNode | null;
    lastChild: SyntaxNode | null;
    childAfter(pos: number): SyntaxNode | null;
    childBefore(pos: number): SyntaxNode | null;
    enter(pos: number, side: -1 | 0 | 1, mode?: IterMode): SyntaxNode | null;
    nextSibling: SyntaxNode | null;
    prevSibling: SyntaxNode | null;
    cursor(mode?: IterMode): TreeCursor;
    resolve(pos: number, side?: -1 | 0 | 1): SyntaxNode;
    resolveInner(pos: number, side?: -1 | 0 | 1): SyntaxNode;
    enterUnfinishedNodesBefore(pos: number): SyntaxNode;
    toTree(): Tree;
    getChild(type: string | number, before?: string | number | null, after?: string | number | null): SyntaxNode | null;
    getChildren(type: string | number, before?: string | number | null, after?: string | number | null): SyntaxNode[];
    matchContext(context: readonly string[]): boolean;
}
declare class TreeCursor implements SyntaxNodeRef {
    type: NodeType;
    get name(): string;
    from: number;
    to: number;
    private stack;
    private bufferNode;
    private yieldNode;
    private yieldBuf;
    private yield;
    firstChild(): boolean;
    lastChild(): boolean;
    childAfter(pos: number): boolean;
    childBefore(pos: number): boolean;
    enter(pos: number, side: -1 | 0 | 1, mode?: IterMode): boolean;
    parent(): boolean;
    nextSibling(): boolean;
    prevSibling(): boolean;
    private atLastNode;
    private move;
    next(enter?: boolean): boolean;
    prev(enter?: boolean): boolean;
    moveTo(pos: number, side?: -1 | 0 | 1): this;
    get node(): SyntaxNode;
    get tree(): Tree | null;
    iterate(enter: (node: SyntaxNodeRef) => boolean | void, leave?: (node: SyntaxNodeRef) => void): void;
    matchContext(context: readonly string[]): boolean;
}

declare class Stack {
    pos: number;
    get context(): any;
    canShift(term: number): boolean;
    get parser(): LRParser;
    dialectEnabled(dialectID: number): boolean;
    private shiftContext;
    private reduceContext;
    private updateContext;
}

declare class InputStream {
    private chunk2;
    private chunk2Pos;
    next: number;
    pos: number;
    private rangeIndex;
    private range;
    peek(offset: number): any;
    acceptToken(token: number, endOffset?: number): void;
    private getChunk;
    private readNext;
    advance(n?: number): number;
    private setDone;
}
interface ExternalOptions {
    contextual?: boolean;
    fallback?: boolean;
    extend?: boolean;
}
declare class ExternalTokenizer {
    constructor(token: (input: InputStream, stack: Stack) => void, options?: ExternalOptions);
}

declare class ContextTracker<T> {
    constructor(spec: {
        start: T;
        shift?(context: T, term: number, stack: Stack, input: InputStream): T;
        reduce?(context: T, term: number, stack: Stack, input: InputStream): T;
        reuse?(context: T, node: Tree, stack: Stack, input: InputStream): T;
        hash?(context: T): number;
        strict?: boolean;
    });
}
interface ParserConfig {
    props?: readonly NodePropSource[];
    top?: string;
    dialect?: string;
    tokenizers?: {
        from: ExternalTokenizer;
        to: ExternalTokenizer;
    }[];
    specializers?: {
        from: (value: string, stack: Stack) => number;
        to: (value: string, stack: Stack) => number;
    }[];
    contextTracker?: ContextTracker<any>;
    strict?: boolean;
    wrap?: ParseWrapper;
    bufferLength?: number;
}
declare class LRParser extends Parser {
    readonly nodeSet: NodeSet;
    createParse(input: Input, fragments: readonly TreeFragment[], ranges: readonly {
        from: number;
        to: number;
    }[]): PartialParse;
    configure(config: ParserConfig): LRParser;
    hasWrappers(): boolean;
    getName(term: number): string;
    get topNode(): NodeType;
    static deserialize(spec: any): LRParser;
}

/**
A text iterator iterates over a sequence of strings. When
iterating over a [`Text`](https://codemirror.net/6/docs/ref/#state.Text) document, result values will
either be lines or line breaks.
*/
interface TextIterator extends Iterator<string>, Iterable<string> {
    /**
    Retrieve the next string. Optionally skip a given number of
    positions after the current position. Always returns the object
    itself.
    */
    next(skip?: number): this;
    /**
    The current string. Will be the empty string when the cursor is
    at its end or `next` hasn't been called on it yet.
    */
    value: string;
    /**
    Whether the end of the iteration has been reached. You should
    probably check this right after calling `next`.
    */
    done: boolean;
    /**
    Whether the current string represents a line break.
    */
    lineBreak: boolean;
}
/**
The data structure for documents. @nonabstract
*/
declare abstract class Text implements Iterable<string> {
    /**
    The length of the string.
    */
    abstract readonly length: number;
    /**
    The number of lines in the string (always >= 1).
    */
    abstract readonly lines: number;
    /**
    Get the line description around the given position.
    */
    lineAt(pos: number): Line$1;
    /**
    Get the description for the given (1-based) line number.
    */
    line(n: number): Line$1;
    /**
    Replace a range of the text with the given content.
    */
    replace(from: number, to: number, text: Text): Text;
    /**
    Append another document to this one.
    */
    append(other: Text): Text;
    /**
    Retrieve the text between the given points.
    */
    slice(from: number, to?: number): Text;
    /**
    Retrieve a part of the document as a string
    */
    abstract sliceString(from: number, to?: number, lineSep?: string): string;
    /**
    Test whether this text is equal to another instance.
    */
    eq(other: Text): boolean;
    /**
    Iterate over the text. When `dir` is `-1`, iteration happens
    from end to start. This will return lines and the breaks between
    them as separate strings.
    */
    iter(dir?: 1 | -1): TextIterator;
    /**
    Iterate over a range of the text. When `from` > `to`, the
    iterator will run in reverse.
    */
    iterRange(from: number, to?: number): TextIterator;
    /**
    Return a cursor that iterates over the given range of lines,
    _without_ returning the line breaks between, and yielding empty
    strings for empty lines.

    When `from` and `to` are given, they should be 1-based line numbers.
    */
    iterLines(from?: number, to?: number): TextIterator;
    /**
    Convert the document to an array of lines (which can be
    deserialized again via [`Text.of`](https://codemirror.net/6/docs/ref/#state.Text^of)).
    */
    toJSON(): string[];
    /**
    If this is a branch node, `children` will hold the `Text`
    objects that it is made up of. For leaf nodes, this holds null.
    */
    abstract readonly children: readonly Text[] | null;
    [Symbol.iterator]: () => Iterator<string>;
    /**
    Create a `Text` instance for the given array of lines.
    */
    static of(text: readonly string[]): Text;
    /**
    Create a `Text` instance for the given array of lines.
    */
    static of2(text: readonly string[][]): Text;
    /**
    The empty document.
    */
    static empty: Text;
}
/**
This type describes a line in the document. It is created
on-demand when lines are [queried](https://codemirror.net/6/docs/ref/#state.Text.lineAt).
*/
declare class Line$1 {
    /**
    The position of the start of the line.
    */
    readonly from: number;
    /**
    The position at the end of the line (_before_ the line break,
    or at the end of document for the last line).
    */
    readonly to: number;
    /**
    This line's line number (1-based).
    */
    readonly number: number;
    /**
    The line's content.
    */
    readonly text: string;
    /**
    The length of the line (not including any line break after it).
    */
    get length(): number;
}

/**
Distinguishes different ways in which positions can be mapped.
*/
declare enum MapMode {
    /**
    Map a position to a valid new position, even when its context
    was deleted.
    */
    Simple = 0,
    /**
    Return null if deletion happens across the position.
    */
    TrackDel = 1,
    /**
    Return null if the character _before_ the position is deleted.
    */
    TrackBefore = 2,
    /**
    Return null if the character _after_ the position is deleted.
    */
    TrackAfter = 3
}
/**
A change description is a variant of [change set](https://codemirror.net/6/docs/ref/#state.ChangeSet)
that doesn't store the inserted text. As such, it can't be
applied, but is cheaper to store and manipulate.
*/
declare class ChangeDesc {
    /**
    The length of the document before the change.
    */
    get length(): number;
    /**
    The length of the document after the change.
    */
    get newLength(): number;
    /**
    False when there are actual changes in this set.
    */
    get empty(): boolean;
    /**
    Iterate over the unchanged parts left by these changes. `posA`
    provides the position of the range in the old document, `posB`
    the new position in the changed document.
    */
    iterGaps(f: (posA: number, posB: number, length: number) => void): void;
    /**
    Iterate over the ranges changed by these changes. (See
    [`ChangeSet.iterChanges`](https://codemirror.net/6/docs/ref/#state.ChangeSet.iterChanges) for a
    variant that also provides you with the inserted text.)
    `fromA`/`toA` provides the extent of the change in the starting
    document, `fromB`/`toB` the extent of the replacement in the
    changed document.

    When `individual` is true, adjacent changes (which are kept
    separate for [position mapping](https://codemirror.net/6/docs/ref/#state.ChangeDesc.mapPos)) are
    reported separately.
    */
    iterChangedRanges(f: (fromA: number, toA: number, fromB: number, toB: number) => void, individual?: boolean): void;
    /**
    Get a description of the inverted form of these changes.
    */
    get invertedDesc(): ChangeDesc;
    /**
    Compute the combined effect of applying another set of changes
    after this one. The length of the document after this set should
    match the length before `other`.
    */
    composeDesc(other: ChangeDesc): ChangeDesc;
    /**
    Map this description, which should start with the same document
    as `other`, over another set of changes, so that it can be
    applied after it. When `before` is true, map as if the changes
    in `other` happened before the ones in `this`.
    */
    mapDesc(other: ChangeDesc, before?: boolean): ChangeDesc;
    /**
    Map a given position through these changes, to produce a
    position pointing into the new document.

    `assoc` indicates which side the position should be associated
    with. When it is negative or zero, the mapping will try to keep
    the position close to the character before it (if any), and will
    move it before insertions at that point or replacements across
    that point. When it is positive, the position is associated with
    the character after it, and will be moved forward for insertions
    at or replacements across the position. Defaults to -1.

    `mode` determines whether deletions should be
    [reported](https://codemirror.net/6/docs/ref/#state.MapMode). It defaults to
    [`MapMode.Simple`](https://codemirror.net/6/docs/ref/#state.MapMode.Simple) (don't report
    deletions).
    */
    mapPos(pos: number, assoc?: number): number;
    mapPos(pos: number, assoc: number, mode: MapMode): number | null;
    /**
    Check whether these changes touch a given range. When one of the
    changes entirely covers the range, the string `"cover"` is
    returned.
    */
    touchesRange(from: number, to?: number): boolean | "cover";
    /**
    Serialize this change desc to a JSON-representable value.
    */
    toJSON(): readonly number[];
    /**
    Create a change desc from its JSON representation (as produced
    by [`toJSON`](https://codemirror.net/6/docs/ref/#state.ChangeDesc.toJSON).
    */
    static fromJSON(json: any): ChangeDesc;
}
/**
This type is used as argument to
[`EditorState.changes`](https://codemirror.net/6/docs/ref/#state.EditorState.changes) and in the
[`changes` field](https://codemirror.net/6/docs/ref/#state.TransactionSpec.changes) of transaction
specs to succinctly describe document changes. It may either be a
plain object describing a change (a deletion, insertion, or
replacement, depending on which fields are present), a [change
set](https://codemirror.net/6/docs/ref/#state.ChangeSet), or an array of change specs.
*/
declare type ChangeSpec = {
    from: number;
    to?: number;
    insert?: string | Text;
} | ChangeSet | readonly ChangeSpec[];
/**
A change set represents a group of modifications to a document. It
stores the document length, and can only be applied to documents
with exactly that length.
*/
declare class ChangeSet extends ChangeDesc {
    private constructor();
    /**
    Apply the changes to a document, returning the modified
    document.
    */
    apply(doc: Text): Text;
    mapDesc(other: ChangeDesc, before?: boolean): ChangeDesc;
    /**
    Given the document as it existed _before_ the changes, return a
    change set that represents the inverse of this set, which could
    be used to go from the document created by the changes back to
    the document as it existed before the changes.
    */
    invert(doc: Text): ChangeSet;
    /**
    Combine two subsequent change sets into a single set. `other`
    must start in the document produced by `this`. If `this` goes
    `docA` → `docB` and `other` represents `docB` → `docC`, the
    returned value will represent the change `docA` → `docC`.
    */
    compose(other: ChangeSet): ChangeSet;
    /**
    Given another change set starting in the same document, maps this
    change set over the other, producing a new change set that can be
    applied to the document produced by applying `other`. When
    `before` is `true`, order changes as if `this` comes before
    `other`, otherwise (the default) treat `other` as coming first.

    Given two changes `A` and `B`, `A.compose(B.map(A))` and
    `B.compose(A.map(B, true))` will produce the same document. This
    provides a basic form of [operational
    transformation](https://en.wikipedia.org/wiki/Operational_transformation),
    and can be used for collaborative editing.
    */
    map(other: ChangeDesc, before?: boolean): ChangeSet;
    /**
    Iterate over the changed ranges in the document, calling `f` for
    each, with the range in the original document (`fromA`-`toA`)
    and the range that replaces it in the new document
    (`fromB`-`toB`).

    When `individual` is true, adjacent changes are reported
    separately.
    */
    iterChanges(f: (fromA: number, toA: number, fromB: number, toB: number, inserted: Text) => void, individual?: boolean): void;
    /**
    Get a [change description](https://codemirror.net/6/docs/ref/#state.ChangeDesc) for this change
    set.
    */
    get desc(): ChangeDesc;
    /**
    Serialize this change set to a JSON-representable value.
    */
    toJSON(): any;
    /**
    Create a change set for the given changes, for a document of the
    given length, using `lineSep` as line separator.
    */
    static of(changes: ChangeSpec, length: number, lineSep?: string): ChangeSet;
    /**
    Create an empty changeset of the given length.
    */
    static empty(length: number): ChangeSet;
    /**
    Create a changeset from its JSON representation (as produced by
    [`toJSON`](https://codemirror.net/6/docs/ref/#state.ChangeSet.toJSON).
    */
    static fromJSON(json: any): ChangeSet;
}

/**
A single selection range. When
[`allowMultipleSelections`](https://codemirror.net/6/docs/ref/#state.EditorState^allowMultipleSelections)
is enabled, a [selection](https://codemirror.net/6/docs/ref/#state.EditorSelection) may hold
multiple ranges. By default, selections hold exactly one range.
*/
declare class SelectionRange {
    /**
    The lower boundary of the range.
    */
    readonly from: number;
    /**
    The upper boundary of the range.
    */
    readonly to: number;
    private flags;
    private constructor();
    /**
    The anchor of the range—the side that doesn't move when you
    extend it.
    */
    get anchor(): number;
    /**
    The head of the range, which is moved when the range is
    [extended](https://codemirror.net/6/docs/ref/#state.SelectionRange.extend).
    */
    get head(): number;
    /**
    True when `anchor` and `head` are at the same position.
    */
    get empty(): boolean;
    /**
    If this is a cursor that is explicitly associated with the
    character on one of its sides, this returns the side. -1 means
    the character before its position, 1 the character after, and 0
    means no association.
    */
    get assoc(): -1 | 0 | 1;
    /**
    The bidirectional text level associated with this cursor, if
    any.
    */
    get bidiLevel(): number | null;
    /**
    The goal column (stored vertical offset) associated with a
    cursor. This is used to preserve the vertical position when
    [moving](https://codemirror.net/6/docs/ref/#view.EditorView.moveVertically) across
    lines of different length.
    */
    get goalColumn(): number | undefined;
    /**
    Map this range through a change, producing a valid range in the
    updated document.
    */
    map(change: ChangeDesc, assoc?: number): SelectionRange;
    /**
    Extend this range to cover at least `from` to `to`.
    */
    extend(from: number, to?: number): SelectionRange;
    /**
    Compare this range to another range.
    */
    eq(other: SelectionRange): boolean;
    /**
    Return a JSON-serializable object representing the range.
    */
    toJSON(): any;
    /**
    Convert a JSON representation of a range to a `SelectionRange`
    instance.
    */
    static fromJSON(json: any): SelectionRange;
}
/**
An editor selection holds one or more selection ranges.
*/
declare class EditorSelection {
    /**
    The ranges in the selection, sorted by position. Ranges cannot
    overlap (but they may touch, if they aren't empty).
    */
    readonly ranges: readonly SelectionRange[];
    /**
    The index of the _main_ range in the selection (which is
    usually the range that was added last).
    */
    readonly mainIndex: number;
    private constructor();
    /**
    Map a selection through a change. Used to adjust the selection
    position for changes.
    */
    map(change: ChangeDesc, assoc?: number): EditorSelection;
    /**
    Compare this selection to another selection.
    */
    eq(other: EditorSelection): boolean;
    /**
    Get the primary selection range. Usually, you should make sure
    your code applies to _all_ ranges, by using methods like
    [`changeByRange`](https://codemirror.net/6/docs/ref/#state.EditorState.changeByRange).
    */
    get main(): SelectionRange;
    /**
    Make sure the selection only has one range. Returns a selection
    holding only the main range from this selection.
    */
    asSingle(): EditorSelection;
    /**
    Extend this selection with an extra range.
    */
    addRange(range: SelectionRange, main?: boolean): EditorSelection;
    /**
    Replace a given range with another range, and then normalize the
    selection to merge and sort ranges if necessary.
    */
    replaceRange(range: SelectionRange, which?: number): EditorSelection;
    /**
    Convert this selection to an object that can be serialized to
    JSON.
    */
    toJSON(): any;
    /**
    Create a selection from a JSON representation.
    */
    static fromJSON(json: any): EditorSelection;
    /**
    Create a selection holding a single range.
    */
    static single(anchor: number, head?: number): EditorSelection;
    /**
    Sort and merge the given set of ranges, creating a valid
    selection.
    */
    static create(ranges: readonly SelectionRange[], mainIndex?: number): EditorSelection;
    /**
    Create a cursor selection range at the given position. You can
    safely ignore the optional arguments in most situations.
    */
    static cursor(pos: number, assoc?: number, bidiLevel?: number, goalColumn?: number): SelectionRange;
    /**
    Create a selection range.
    */
    static range(anchor: number, head: number, goalColumn?: number, bidiLevel?: number): SelectionRange;
}

declare type FacetConfig<Input, Output> = {
    /**
    How to combine the input values into a single output value. When
    not given, the array of input values becomes the output. This
    function will immediately be called on creating the facet, with
    an empty array, to compute the facet's default value when no
    inputs are present.
    */
    combine?: (value: readonly Input[]) => Output;
    /**
    How to compare output values to determine whether the value of
    the facet changed. Defaults to comparing by `===` or, if no
    `combine` function was given, comparing each element of the
    array with `===`.
    */
    compare?: (a: Output, b: Output) => boolean;
    /**
    How to compare input values to avoid recomputing the output
    value when no inputs changed. Defaults to comparing with `===`.
    */
    compareInput?: (a: Input, b: Input) => boolean;
    /**
    Forbids dynamic inputs to this facet.
    */
    static?: boolean;
    /**
    If given, these extension(s) (or the result of calling the given
    function with the facet) will be added to any state where this
    facet is provided. (Note that, while a facet's default value can
    be read from a state even if the facet wasn't present in the
    state at all, these extensions won't be added in that
    situation.)
    */
    enables?: Extension | ((self: Facet<Input, Output>) => Extension);
};
/**
A facet is a labeled value that is associated with an editor
state. It takes inputs from any number of extensions, and combines
those into a single output value.

Examples of uses of facets are the [tab
size](https://codemirror.net/6/docs/ref/#state.EditorState^tabSize), [editor
attributes](https://codemirror.net/6/docs/ref/#view.EditorView^editorAttributes), and [update
listeners](https://codemirror.net/6/docs/ref/#view.EditorView^updateListener).
*/
declare class Facet<Input, Output = readonly Input[]> {
    private isStatic;
    private constructor();
    /**
    Define a new facet.
    */
    static define<Input, Output = readonly Input[]>(config?: FacetConfig<Input, Output>): Facet<Input, Output>;
    /**
    Returns an extension that adds the given value to this facet.
    */
    of(value: Input): Extension;
    /**
    Create an extension that computes a value for the facet from a
    state. You must take care to declare the parts of the state that
    this value depends on, since your function is only called again
    for a new state when one of those parts changed.

    In cases where your value depends only on a single field, you'll
    want to use the [`from`](https://codemirror.net/6/docs/ref/#state.Facet.from) method instead.
    */
    compute(deps: readonly Slot<any>[], get: (state: EditorState) => Input): Extension;
    /**
    Create an extension that computes zero or more values for this
    facet from a state.
    */
    computeN(deps: readonly Slot<any>[], get: (state: EditorState) => readonly Input[]): Extension;
    /**
    Shorthand method for registering a facet source with a state
    field as input. If the field's type corresponds to this facet's
    input type, the getter function can be omitted. If given, it
    will be used to retrieve the input from the field value.
    */
    from<T extends Input>(field: StateField<T>): Extension;
    from<T>(field: StateField<T>, get: (value: T) => Input): Extension;
}
declare type Slot<T> = Facet<any, T> | StateField<T> | "doc" | "selection";
declare type StateFieldSpec<Value> = {
    /**
    Creates the initial value for the field when a state is created.
    */
    create: (state: EditorState) => Value;
    /**
    Compute a new value from the field's previous value and a
    [transaction](https://codemirror.net/6/docs/ref/#state.Transaction).
    */
    update: (value: Value, transaction: Transaction) => Value;
    /**
    Compare two values of the field, returning `true` when they are
    the same. This is used to avoid recomputing facets that depend
    on the field when its value did not change. Defaults to using
    `===`.
    */
    compare?: (a: Value, b: Value) => boolean;
    /**
    Provide extensions based on this field. The given function will
    be called once with the initialized field. It will usually want
    to call some facet's [`from`](https://codemirror.net/6/docs/ref/#state.Facet.from) method to
    create facet inputs from this field, but can also return other
    extensions that should be enabled when the field is present in a
    configuration.
    */
    provide?: (field: StateField<Value>) => Extension;
    /**
    A function used to serialize this field's content to JSON. Only
    necessary when this field is included in the argument to
    [`EditorState.toJSON`](https://codemirror.net/6/docs/ref/#state.EditorState.toJSON).
    */
    toJSON?: (value: Value, state: EditorState) => any;
    /**
    A function that deserializes the JSON representation of this
    field's content.
    */
    fromJSON?: (json: any, state: EditorState) => Value;
};
/**
Fields can store additional information in an editor state, and
keep it in sync with the rest of the state.
*/
declare class StateField<Value> {
    private createF;
    private updateF;
    private compareF;
    private constructor();
    /**
    Define a state field.
    */
    static define<Value>(config: StateFieldSpec<Value>): StateField<Value>;
    private create;
    /**
    Returns an extension that enables this field and overrides the
    way it is initialized. Can be useful when you need to provide a
    non-default starting value for the field.
    */
    init(create: (state: EditorState) => Value): Extension;
    /**
    State field instances can be used as
    [`Extension`](https://codemirror.net/6/docs/ref/#state.Extension) values to enable the field in a
    given state.
    */
    get extension(): Extension;
}
/**
Extension values can be
[provided](https://codemirror.net/6/docs/ref/#state.EditorStateConfig.extensions) when creating a
state to attach various kinds of configuration and behavior
information. They can either be built-in extension-providing
objects, such as [state fields](https://codemirror.net/6/docs/ref/#state.StateField) or [facet
providers](https://codemirror.net/6/docs/ref/#state.Facet.of), or objects with an extension in its
`extension` property. Extensions can be nested in arrays
arbitrarily deep—they will be flattened when processed.
*/
declare type Extension = {
    extension: Extension;
} | readonly Extension[];
/**
By default extensions are registered in the order they are found
in the flattened form of nested array that was provided.
Individual extension values can be assigned a precedence to
override this. Extensions that do not have a precedence set get
the precedence of the nearest parent with a precedence, or
[`default`](https://codemirror.net/6/docs/ref/#state.Prec.default) if there is no such parent. The
final ordering of extensions is determined by first sorting by
precedence and then by order within each precedence.
*/
declare const Prec: {
    /**
    The highest precedence level, for extensions that should end up
    near the start of the precedence ordering.
    */
    highest: (ext: Extension) => Extension;
    /**
    A higher-than-default precedence, for extensions that should
    come before those with default precedence.
    */
    high: (ext: Extension) => Extension;
    /**
    The default precedence, which is also used for extensions
    without an explicit precedence.
    */
    default: (ext: Extension) => Extension;
    /**
    A lower-than-default precedence.
    */
    low: (ext: Extension) => Extension;
    /**
    The lowest precedence level. Meant for things that should end up
    near the end of the extension order.
    */
    lowest: (ext: Extension) => Extension;
};
/**
Extension compartments can be used to make a configuration
dynamic. By [wrapping](https://codemirror.net/6/docs/ref/#state.Compartment.of) part of your
configuration in a compartment, you can later
[replace](https://codemirror.net/6/docs/ref/#state.Compartment.reconfigure) that part through a
transaction.
*/
declare class Compartment {
    /**
    Create an instance of this compartment to add to your [state
    configuration](https://codemirror.net/6/docs/ref/#state.EditorStateConfig.extensions).
    */
    of(ext: Extension): Extension;
    /**
    Create an [effect](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) that
    reconfigures this compartment.
    */
    reconfigure(content: Extension): StateEffect<unknown>;
    /**
    Get the current content of the compartment in the state, or
    `undefined` if it isn't present.
    */
    get(state: EditorState): Extension | undefined;
}

/**
Annotations are tagged values that are used to add metadata to
transactions in an extensible way. They should be used to model
things that effect the entire transaction (such as its [time
stamp](https://codemirror.net/6/docs/ref/#state.Transaction^time) or information about its
[origin](https://codemirror.net/6/docs/ref/#state.Transaction^userEvent)). For effects that happen
_alongside_ the other changes made by the transaction, [state
effects](https://codemirror.net/6/docs/ref/#state.StateEffect) are more appropriate.
*/
declare class Annotation<T> {
    /**
    The annotation type.
    */
    readonly type: AnnotationType<T>;
    /**
    The value of this annotation.
    */
    readonly value: T;
    /**
    Define a new type of annotation.
    */
    static define<T>(): AnnotationType<T>;
    private _isAnnotation;
}
/**
Marker that identifies a type of [annotation](https://codemirror.net/6/docs/ref/#state.Annotation).
*/
declare class AnnotationType<T> {
    /**
    Create an instance of this annotation.
    */
    of(value: T): Annotation<T>;
}
interface StateEffectSpec<Value> {
    /**
    Provides a way to map an effect like this through a position
    mapping. When not given, the effects will simply not be mapped.
    When the function returns `undefined`, that means the mapping
    deletes the effect.
    */
    map?: (value: Value, mapping: ChangeDesc) => Value | undefined;
}
/**
Representation of a type of state effect. Defined with
[`StateEffect.define`](https://codemirror.net/6/docs/ref/#state.StateEffect^define).
*/
declare class StateEffectType<Value> {
    /**
    @internal
    */
    readonly map: (value: any, mapping: ChangeDesc) => any | undefined;
    /**
    Create a [state effect](https://codemirror.net/6/docs/ref/#state.StateEffect) instance of this
    type.
    */
    of(value: Value): StateEffect<Value>;
}
/**
State effects can be used to represent additional effects
associated with a [transaction](https://codemirror.net/6/docs/ref/#state.Transaction.effects). They
are often useful to model changes to custom [state
fields](https://codemirror.net/6/docs/ref/#state.StateField), when those changes aren't implicit in
document or selection changes.
*/
declare class StateEffect<Value> {
    /**
    The value of this effect.
    */
    readonly value: Value;
    /**
    Map this effect through a position mapping. Will return
    `undefined` when that ends up deleting the effect.
    */
    map(mapping: ChangeDesc): StateEffect<Value> | undefined;
    /**
    Tells you whether this effect object is of a given
    [type](https://codemirror.net/6/docs/ref/#state.StateEffectType).
    */
    is<T>(type: StateEffectType<T>): this is StateEffect<T>;
    /**
    Define a new effect type. The type parameter indicates the type
    of values that his effect holds.
    */
    static define<Value = null>(spec?: StateEffectSpec<Value>): StateEffectType<Value>;
    /**
    Map an array of effects through a change set.
    */
    static mapEffects(effects: readonly StateEffect<any>[], mapping: ChangeDesc): readonly StateEffect<any>[];
    /**
    This effect can be used to reconfigure the root extensions of
    the editor. Doing this will discard any extensions
    [appended](https://codemirror.net/6/docs/ref/#state.StateEffect^appendConfig), but does not reset
    the content of [reconfigured](https://codemirror.net/6/docs/ref/#state.Compartment.reconfigure)
    compartments.
    */
    static reconfigure: StateEffectType<Extension>;
    /**
    Append extensions to the top-level configuration of the editor.
    */
    static appendConfig: StateEffectType<Extension>;
}
/**
Describes a [transaction](https://codemirror.net/6/docs/ref/#state.Transaction) when calling the
[`EditorState.update`](https://codemirror.net/6/docs/ref/#state.EditorState.update) method.
*/
interface TransactionSpec {
    /**
    The changes to the document made by this transaction.
    */
    changes?: ChangeSpec;
    /**
    When set, this transaction explicitly updates the selection.
    Offsets in this selection should refer to the document as it is
    _after_ the transaction.
    */
    selection?: EditorSelection | {
        anchor: number;
        head?: number;
    };
    /**
    Attach [state effects](https://codemirror.net/6/docs/ref/#state.StateEffect) to this transaction.
    Again, when they contain positions and this same spec makes
    changes, those positions should refer to positions in the
    updated document.
    */
    effects?: StateEffect<any> | readonly StateEffect<any>[];
    /**
    Set [annotations](https://codemirror.net/6/docs/ref/#state.Annotation) for this transaction.
    */
    annotations?: Annotation<any> | readonly Annotation<any>[];
    /**
    Shorthand for `annotations:` [`Transaction.userEvent`](https://codemirror.net/6/docs/ref/#state.Transaction^userEvent)`.of(...)`.
    */
    userEvent?: string;
    /**
    When set to `true`, the transaction is marked as needing to
    scroll the current selection into view.
    */
    scrollIntoView?: boolean;
    /**
    By default, transactions can be modified by [change
    filters](https://codemirror.net/6/docs/ref/#state.EditorState^changeFilter) and [transaction
    filters](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter). You can set this
    to `false` to disable that. This can be necessary for
    transactions that, for example, include annotations that must be
    kept consistent with their changes.
    */
    filter?: boolean;
    /**
    Normally, when multiple specs are combined (for example by
    [`EditorState.update`](https://codemirror.net/6/docs/ref/#state.EditorState.update)), the
    positions in `changes` are taken to refer to the document
    positions in the initial document. When a spec has `sequental`
    set to true, its positions will be taken to refer to the
    document created by the specs before it instead.
    */
    sequential?: boolean;
}
/**
Changes to the editor state are grouped into transactions.
Typically, a user action creates a single transaction, which may
contain any number of document changes, may change the selection,
or have other effects. Create a transaction by calling
[`EditorState.update`](https://codemirror.net/6/docs/ref/#state.EditorState.update), or immediately
dispatch one by calling
[`EditorView.dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch).
*/
declare class Transaction {
    /**
    The state from which the transaction starts.
    */
    readonly startState: EditorState;
    /**
    The document changes made by this transaction.
    */
    readonly changes: ChangeSet;
    /**
    The selection set by this transaction, or undefined if it
    doesn't explicitly set a selection.
    */
    readonly selection: EditorSelection | undefined;
    /**
    The effects added to the transaction.
    */
    readonly effects: readonly StateEffect<any>[];
    /**
    Whether the selection should be scrolled into view after this
    transaction is dispatched.
    */
    readonly scrollIntoView: boolean;
    private constructor();
    /**
    The new document produced by the transaction. Contrary to
    [`.state`](https://codemirror.net/6/docs/ref/#state.Transaction.state)`.doc`, accessing this won't
    force the entire new state to be computed right away, so it is
    recommended that [transaction
    filters](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter) use this getter
    when they need to look at the new document.
    */
    get newDoc(): Text;
    /**
    The new selection produced by the transaction. If
    [`this.selection`](https://codemirror.net/6/docs/ref/#state.Transaction.selection) is undefined,
    this will [map](https://codemirror.net/6/docs/ref/#state.EditorSelection.map) the start state's
    current selection through the changes made by the transaction.
    */
    get newSelection(): EditorSelection;
    /**
    The new state created by the transaction. Computed on demand
    (but retained for subsequent access), so it is recommended not to
    access it in [transaction
    filters](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter) when possible.
    */
    get state(): EditorState;
    /**
    Get the value of the given annotation type, if any.
    */
    annotation<T>(type: AnnotationType<T>): T | undefined;
    /**
    Indicates whether the transaction changed the document.
    */
    get docChanged(): boolean;
    /**
    Indicates whether this transaction reconfigures the state
    (through a [configuration compartment](https://codemirror.net/6/docs/ref/#state.Compartment) or
    with a top-level configuration
    [effect](https://codemirror.net/6/docs/ref/#state.StateEffect^reconfigure).
    */
    get reconfigured(): boolean;
    /**
    Returns true if the transaction has a [user
    event](https://codemirror.net/6/docs/ref/#state.Transaction^userEvent) annotation that is equal to
    or more specific than `event`. For example, if the transaction
    has `"select.pointer"` as user event, `"select"` and
    `"select.pointer"` will match it.
    */
    isUserEvent(event: string): boolean;
    /**
    Annotation used to store transaction timestamps. Automatically
    added to every transaction, holding `Date.now()`.
    */
    static time: AnnotationType<number>;
    /**
    Annotation used to associate a transaction with a user interface
    event. Holds a string identifying the event, using a
    dot-separated format to support attaching more specific
    information. The events used by the core libraries are:

     - `"input"` when content is entered
       - `"input.type"` for typed input
         - `"input.type.compose"` for composition
       - `"input.paste"` for pasted input
       - `"input.drop"` when adding content with drag-and-drop
       - `"input.complete"` when autocompleting
     - `"delete"` when the user deletes content
       - `"delete.selection"` when deleting the selection
       - `"delete.forward"` when deleting forward from the selection
       - `"delete.backward"` when deleting backward from the selection
       - `"delete.cut"` when cutting to the clipboard
     - `"move"` when content is moved
       - `"move.drop"` when content is moved within the editor through drag-and-drop
     - `"select"` when explicitly changing the selection
       - `"select.pointer"` when selecting with a mouse or other pointing device
     - `"undo"` and `"redo"` for history actions

    Use [`isUserEvent`](https://codemirror.net/6/docs/ref/#state.Transaction.isUserEvent) to check
    whether the annotation matches a given event.
    */
    static userEvent: AnnotationType<string>;
    /**
    Annotation indicating whether a transaction should be added to
    the undo history or not.
    */
    static addToHistory: AnnotationType<boolean>;
    /**
    Annotation indicating (when present and true) that a transaction
    represents a change made by some other actor, not the user. This
    is used, for example, to tag other people's changes in
    collaborative editing.
    */
    static remote: AnnotationType<boolean>;
}

/**
The categories produced by a [character
categorizer](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer). These are used
do things like selecting by word.
*/
declare enum CharCategory {
    /**
    Word characters.
    */
    Word = 0,
    /**
    Whitespace.
    */
    Space = 1,
    /**
    Anything else.
    */
    Other = 2
}

/**
Options passed when [creating](https://codemirror.net/6/docs/ref/#state.EditorState^create) an
editor state.
*/
interface EditorStateConfig {
    /**
    The initial document. Defaults to an empty document. Can be
    provided either as a plain string (which will be split into
    lines according to the value of the [`lineSeparator`
    facet](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator)), or an instance of
    the [`Text`](https://codemirror.net/6/docs/ref/#state.Text) class (which is what the state will use
    to represent the document).
    */
    doc?: string | Text;
    /**
    The starting selection. Defaults to a cursor at the very start
    of the document.
    */
    selection?: EditorSelection | {
        anchor: number;
        head?: number;
    };
    /**
    [Extension(s)](https://codemirror.net/6/docs/ref/#state.Extension) to associate with this state.
    */
    extensions?: Extension;
}
/**
The editor state class is a persistent (immutable) data structure.
To update a state, you [create](https://codemirror.net/6/docs/ref/#state.EditorState.update) a
[transaction](https://codemirror.net/6/docs/ref/#state.Transaction), which produces a _new_ state
instance, without modifying the original object.

As such, _never_ mutate properties of a state directly. That'll
just break things.
*/
declare class EditorState {
    /**
    The current document.
    */
    readonly doc: Text;
    /**
    The current selection.
    */
    readonly selection: EditorSelection;
    private constructor();
    /**
    Retrieve the value of a [state field](https://codemirror.net/6/docs/ref/#state.StateField). Throws
    an error when the state doesn't have that field, unless you pass
    `false` as second parameter.
    */
    field<T>(field: StateField<T>): T;
    field<T>(field: StateField<T>, require: false): T | undefined;
    /**
    Create a [transaction](https://codemirror.net/6/docs/ref/#state.Transaction) that updates this
    state. Any number of [transaction specs](https://codemirror.net/6/docs/ref/#state.TransactionSpec)
    can be passed. Unless
    [`sequential`](https://codemirror.net/6/docs/ref/#state.TransactionSpec.sequential) is set, the
    [changes](https://codemirror.net/6/docs/ref/#state.TransactionSpec.changes) (if any) of each spec
    are assumed to start in the _current_ document (not the document
    produced by previous specs), and its
    [selection](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection) and
    [effects](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) are assumed to refer
    to the document created by its _own_ changes. The resulting
    transaction contains the combined effect of all the different
    specs. For [selection](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection), later
    specs take precedence over earlier ones.
    */
    update(...specs: readonly TransactionSpec[]): Transaction;
    /**
    Create a [transaction spec](https://codemirror.net/6/docs/ref/#state.TransactionSpec) that
    replaces every selection range with the given content.
    */
    replaceSelection(text: string | Text): TransactionSpec;
    /**
    Create a set of changes and a new selection by running the given
    function for each range in the active selection. The function
    can return an optional set of changes (in the coordinate space
    of the start document), plus an updated range (in the coordinate
    space of the document produced by the call's own changes). This
    method will merge all the changes and ranges into a single
    changeset and selection, and return it as a [transaction
    spec](https://codemirror.net/6/docs/ref/#state.TransactionSpec), which can be passed to
    [`update`](https://codemirror.net/6/docs/ref/#state.EditorState.update).
    */
    changeByRange(f: (range: SelectionRange) => {
        range: SelectionRange;
        changes?: ChangeSpec;
        effects?: StateEffect<any> | readonly StateEffect<any>[];
    }): {
        changes: ChangeSet;
        selection: EditorSelection;
        effects: readonly StateEffect<any>[];
    };
    /**
    Create a [change set](https://codemirror.net/6/docs/ref/#state.ChangeSet) from the given change
    description, taking the state's document length and line
    separator into account.
    */
    changes(spec?: ChangeSpec): ChangeSet;
    /**
    Using the state's [line
    separator](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator), create a
    [`Text`](https://codemirror.net/6/docs/ref/#state.Text) instance from the given string.
    */
    toText(string: string): Text;
    /**
    Return the given range of the document as a string.
    */
    sliceDoc(from?: number, to?: number): string;
    /**
    Get the value of a state [facet](https://codemirror.net/6/docs/ref/#state.Facet).
    */
    facet<Output>(facet: Facet<any, Output>): Output;
    /**
    Convert this state to a JSON-serializable object. When custom
    fields should be serialized, you can pass them in as an object
    mapping property names (in the resulting object, which should
    not use `doc` or `selection`) to fields.
    */
    toJSON(fields?: {
        [prop: string]: StateField<any>;
    }): any;
    /**
    Deserialize a state from its JSON representation. When custom
    fields should be deserialized, pass the same object you passed
    to [`toJSON`](https://codemirror.net/6/docs/ref/#state.EditorState.toJSON) when serializing as
    third argument.
    */
    static fromJSON(json: any, config?: EditorStateConfig, fields?: {
        [prop: string]: StateField<any>;
    }): EditorState;
    /**
    Create a new state. You'll usually only need this when
    initializing an editor—updated states are created by applying
    transactions.
    */
    static create(config?: EditorStateConfig): EditorState;
    /**
    A facet that, when enabled, causes the editor to allow multiple
    ranges to be selected. Be careful though, because by default the
    editor relies on the native DOM selection, which cannot handle
    multiple selections. An extension like
    [`drawSelection`](https://codemirror.net/6/docs/ref/#view.drawSelection) can be used to make
    secondary selections visible to the user.
    */
    static allowMultipleSelections: Facet<boolean, boolean>;
    /**
    Configures the tab size to use in this state. The first
    (highest-precedence) value of the facet is used. If no value is
    given, this defaults to 4.
    */
    static tabSize: Facet<number, number>;
    /**
    The size (in columns) of a tab in the document, determined by
    the [`tabSize`](https://codemirror.net/6/docs/ref/#state.EditorState^tabSize) facet.
    */
    get tabSize(): number;
    /**
    The line separator to use. By default, any of `"\n"`, `"\r\n"`
    and `"\r"` is treated as a separator when splitting lines, and
    lines are joined with `"\n"`.

    When you configure a value here, only that precise separator
    will be used, allowing you to round-trip documents through the
    editor without normalizing line separators.
    */
    static lineSeparator: Facet<string, string | undefined>;
    /**
    Get the proper [line-break](https://codemirror.net/6/docs/ref/#state.EditorState^lineSeparator)
    string for this state.
    */
    get lineBreak(): string;
    /**
    This facet controls the value of the
    [`readOnly`](https://codemirror.net/6/docs/ref/#state.EditorState.readOnly) getter, which is
    consulted by commands and extensions that implement editing
    functionality to determine whether they should apply. It
    defaults to false, but when its highest-precedence value is
    `true`, such functionality disables itself.

    Not to be confused with
    [`EditorView.editable`](https://codemirror.net/6/docs/ref/#view.EditorView^editable), which
    controls whether the editor's DOM is set to be editable (and
    thus focusable).
    */
    static readOnly: Facet<boolean, boolean>;
    /**
    Returns true when the editor is
    [configured](https://codemirror.net/6/docs/ref/#state.EditorState^readOnly) to be read-only.
    */
    get readOnly(): boolean;
    /**
    Registers translation phrases. The
    [`phrase`](https://codemirror.net/6/docs/ref/#state.EditorState.phrase) method will look through
    all objects registered with this facet to find translations for
    its argument.
    */
    static phrases: Facet<{
        [key: string]: string;
    }, readonly {
        [key: string]: string;
    }[]>;
    /**
    Look up a translation for the given phrase (via the
    [`phrases`](https://codemirror.net/6/docs/ref/#state.EditorState^phrases) facet), or return the
    original string if no translation is found.

    If additional arguments are passed, they will be inserted in
    place of markers like `$1` (for the first value) and `$2`, etc.
    A single `$` is equivalent to `$1`, and `$$` will produce a
    literal dollar sign.
    */
    phrase(phrase: string, ...insert: any[]): string;
    /**
    A facet used to register [language
    data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt) providers.
    */
    static languageData: Facet<(state: EditorState, pos: number, side: 0 | 1 | -1) => readonly {
        [name: string]: any;
    }[], readonly ((state: EditorState, pos: number, side: 0 | 1 | -1) => readonly {
        [name: string]: any;
    }[])[]>;
    /**
    Find the values for a given language data field, provided by the
    the [`languageData`](https://codemirror.net/6/docs/ref/#state.EditorState^languageData) facet.

    Examples of language data fields are...

    - [`"commentTokens"`](https://codemirror.net/6/docs/ref/#commands.CommentTokens) for specifying
      comment syntax.
    - [`"autocomplete"`](https://codemirror.net/6/docs/ref/#autocomplete.autocompletion^config.override)
      for providing language-specific completion sources.
    - [`"wordChars"`](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) for adding
      characters that should be considered part of words in this
      language.
    - [`"closeBrackets"`](https://codemirror.net/6/docs/ref/#autocomplete.CloseBracketConfig) controls
      bracket closing behavior.
    */
    languageDataAt<T>(name: string, pos: number, side?: -1 | 0 | 1): readonly T[];
    /**
    Return a function that can categorize strings (expected to
    represent a single [grapheme cluster](https://codemirror.net/6/docs/ref/#state.findClusterBreak))
    into one of:

     - Word (contains an alphanumeric character or a character
       explicitly listed in the local language's `"wordChars"`
       language data, which should be a string)
     - Space (contains only whitespace)
     - Other (anything else)
    */
    charCategorizer(at: number): (char: string) => CharCategory;
    /**
    Find the word at the given position, meaning the range
    containing all [word](https://codemirror.net/6/docs/ref/#state.CharCategory.Word) characters
    around it. If no word characters are adjacent to the position,
    this returns null.
    */
    wordAt(pos: number): SelectionRange | null;
    /**
    Facet used to register change filters, which are called for each
    transaction (unless explicitly
    [disabled](https://codemirror.net/6/docs/ref/#state.TransactionSpec.filter)), and can suppress
    part of the transaction's changes.

    Such a function can return `true` to indicate that it doesn't
    want to do anything, `false` to completely stop the changes in
    the transaction, or a set of ranges in which changes should be
    suppressed. Such ranges are represented as an array of numbers,
    with each pair of two numbers indicating the start and end of a
    range. So for example `[10, 20, 100, 110]` suppresses changes
    between 10 and 20, and between 100 and 110.
    */
    static changeFilter: Facet<(tr: Transaction) => boolean | readonly number[], readonly ((tr: Transaction) => boolean | readonly number[])[]>;
    /**
    Facet used to register a hook that gets a chance to update or
    replace transaction specs before they are applied. This will
    only be applied for transactions that don't have
    [`filter`](https://codemirror.net/6/docs/ref/#state.TransactionSpec.filter) set to `false`. You
    can either return a single transaction spec (possibly the input
    transaction), or an array of specs (which will be combined in
    the same way as the arguments to
    [`EditorState.update`](https://codemirror.net/6/docs/ref/#state.EditorState.update)).

    When possible, it is recommended to avoid accessing
    [`Transaction.state`](https://codemirror.net/6/docs/ref/#state.Transaction.state) in a filter,
    since it will force creation of a state that will then be
    discarded again, if the transaction is actually filtered.

    (This functionality should be used with care. Indiscriminately
    modifying transaction is likely to break something or degrade
    the user experience.)
    */
    static transactionFilter: Facet<(tr: Transaction) => TransactionSpec | readonly TransactionSpec[], readonly ((tr: Transaction) => TransactionSpec | readonly TransactionSpec[])[]>;
    /**
    This is a more limited form of
    [`transactionFilter`](https://codemirror.net/6/docs/ref/#state.EditorState^transactionFilter),
    which can only add
    [annotations](https://codemirror.net/6/docs/ref/#state.TransactionSpec.annotations) and
    [effects](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects). _But_, this type
    of filter runs even if the transaction has disabled regular
    [filtering](https://codemirror.net/6/docs/ref/#state.TransactionSpec.filter), making it suitable
    for effects that don't need to touch the changes or selection,
    but do want to process every transaction.

    Extenders run _after_ filters, when both are present.
    */
    static transactionExtender: Facet<(tr: Transaction) => Pick<TransactionSpec, "effects" | "annotations"> | null, readonly ((tr: Transaction) => Pick<TransactionSpec, "effects" | "annotations"> | null)[]>;
}

/**
Subtype of [`Command`](https://codemirror.net/6/docs/ref/#view.Command) that doesn't require access
to the actual editor view. Mostly useful to define commands that
can be run and tested outside of a browser environment.
*/
declare type StateCommand = (target: {
    state: EditorState;
    dispatch: (transaction: Transaction) => void;
}) => boolean;

/**
Each range is associated with a value, which must inherit from
this class.
*/
declare abstract class RangeValue {
    /**
    Compare this value with another value. Used when comparing
    rangesets. The default implementation compares by identity.
    Unless you are only creating a fixed number of unique instances
    of your value type, it is a good idea to implement this
    properly.
    */
    eq(other: RangeValue): boolean;
    /**
    The bias value at the start of the range. Determines how the
    range is positioned relative to other ranges starting at this
    position. Defaults to 0.
    */
    startSide: number;
    /**
    The bias value at the end of the range. Defaults to 0.
    */
    endSide: number;
    /**
    The mode with which the location of the range should be mapped
    when its `from` and `to` are the same, to decide whether a
    change deletes the range. Defaults to `MapMode.TrackDel`.
    */
    mapMode: MapMode;
    /**
    Determines whether this value marks a point range. Regular
    ranges affect the part of the document they cover, and are
    meaningless when empty. Point ranges have a meaning on their
    own. When non-empty, a point range is treated as atomic and
    shadows any ranges contained in it.
    */
    point: boolean;
    /**
    Create a [range](https://codemirror.net/6/docs/ref/#state.Range) with this value.
    */
    range(from: number, to?: number): Range<this>;
}
/**
A range associates a value with a range of positions.
*/
declare class Range<T extends RangeValue> {
    /**
    The range's start position.
    */
    readonly from: number;
    /**
    Its end position.
    */
    readonly to: number;
    /**
    The value associated with this range.
    */
    readonly value: T;
    private constructor();
}
/**
Collection of methods used when comparing range sets.
*/
interface RangeComparator<T extends RangeValue> {
    /**
    Notifies the comparator that a range (in positions in the new
    document) has the given sets of values associated with it, which
    are different in the old (A) and new (B) sets.
    */
    compareRange(from: number, to: number, activeA: T[], activeB: T[]): void;
    /**
    Notification for a changed (or inserted, or deleted) point range.
    */
    comparePoint(from: number, to: number, pointA: T | null, pointB: T | null): void;
}
/**
Methods used when iterating over the spans created by a set of
ranges. The entire iterated range will be covered with either
`span` or `point` calls.
*/
interface SpanIterator<T extends RangeValue> {
    /**
    Called for any ranges not covered by point decorations. `active`
    holds the values that the range is marked with (and may be
    empty). `openStart` indicates how many of those ranges are open
    (continued) at the start of the span.
    */
    span(from: number, to: number, active: readonly T[], openStart: number): void;
    /**
    Called when going over a point decoration. The active range
    decorations that cover the point and have a higher precedence
    are provided in `active`. The open count in `openStart` counts
    the number of those ranges that started before the point and. If
    the point started before the iterated range, `openStart` will be
    `active.length + 1` to signal this.
    */
    point(from: number, to: number, value: T, active: readonly T[], openStart: number, index: number): void;
}
/**
A range cursor is an object that moves to the next range every
time you call `next` on it. Note that, unlike ES6 iterators, these
start out pointing at the first element, so you should call `next`
only after reading the first range (if any).
*/
interface RangeCursor<T> {
    /**
    Move the iterator forward.
    */
    next: () => void;
    /**
    The next range's value. Holds `null` when the cursor has reached
    its end.
    */
    value: T | null;
    /**
    The next range's start position.
    */
    from: number;
    /**
    The next end position.
    */
    to: number;
}
declare type RangeSetUpdate<T extends RangeValue> = {
    /**
    An array of ranges to add. If given, this should be sorted by
    `from` position and `startSide` unless
    [`sort`](https://codemirror.net/6/docs/ref/#state.RangeSet.update^updateSpec.sort) is given as
    `true`.
    */
    add?: readonly Range<T>[];
    /**
    Indicates whether the library should sort the ranges in `add`.
    Defaults to `false`.
    */
    sort?: boolean;
    /**
    Filter the ranges already in the set. Only those for which this
    function returns `true` are kept.
    */
    filter?: (from: number, to: number, value: T) => boolean;
    /**
    Can be used to limit the range on which the filter is
    applied. Filtering only a small range, as opposed to the entire
    set, can make updates cheaper.
    */
    filterFrom?: number;
    /**
    The end position to apply the filter to.
    */
    filterTo?: number;
};
/**
A range set stores a collection of [ranges](https://codemirror.net/6/docs/ref/#state.Range) in a
way that makes them efficient to [map](https://codemirror.net/6/docs/ref/#state.RangeSet.map) and
[update](https://codemirror.net/6/docs/ref/#state.RangeSet.update). This is an immutable data
structure.
*/
declare class RangeSet<T extends RangeValue> {
    private constructor();
    /**
    The number of ranges in the set.
    */
    get size(): number;
    /**
    Update the range set, optionally adding new ranges or filtering
    out existing ones.

    (Note: The type parameter is just there as a kludge to work
    around TypeScript variance issues that prevented `RangeSet<X>`
    from being a subtype of `RangeSet<Y>` when `X` is a subtype of
    `Y`.)
    */
    update<U extends T>(updateSpec: RangeSetUpdate<U>): RangeSet<T>;
    /**
    Map this range set through a set of changes, return the new set.
    */
    map(changes: ChangeDesc): RangeSet<T>;
    /**
    Iterate over the ranges that touch the region `from` to `to`,
    calling `f` for each. There is no guarantee that the ranges will
    be reported in any specific order. When the callback returns
    `false`, iteration stops.
    */
    between(from: number, to: number, f: (from: number, to: number, value: T) => void | false): void;
    /**
    Iterate over the ranges in this set, in order, including all
    ranges that end at or after `from`.
    */
    iter(from?: number): RangeCursor<T>;
    /**
    Iterate over the ranges in a collection of sets, in order,
    starting from `from`.
    */
    static iter<T extends RangeValue>(sets: readonly RangeSet<T>[], from?: number): RangeCursor<T>;
    /**
    Iterate over two groups of sets, calling methods on `comparator`
    to notify it of possible differences.
    */
    static compare<T extends RangeValue>(oldSets: readonly RangeSet<T>[], newSets: readonly RangeSet<T>[],
    /**
    This indicates how the underlying data changed between these
    ranges, and is needed to synchronize the iteration. `from` and
    `to` are coordinates in the _new_ space, after these changes.
    */
    textDiff: ChangeDesc, comparator: RangeComparator<T>,
    /**
    Can be used to ignore all non-point ranges, and points below
    the given size. When -1, all ranges are compared.
    */
    minPointSize?: number): void;
    /**
    Compare the contents of two groups of range sets, returning true
    if they are equivalent in the given range.
    */
    static eq<T extends RangeValue>(oldSets: readonly RangeSet<T>[], newSets: readonly RangeSet<T>[], from?: number, to?: number): boolean;
    /**
    Iterate over a group of range sets at the same time, notifying
    the iterator about the ranges covering every given piece of
    content. Returns the open count (see
    [`SpanIterator.span`](https://codemirror.net/6/docs/ref/#state.SpanIterator.span)) at the end
    of the iteration.
    */
    static spans<T extends RangeValue>(sets: readonly RangeSet<T>[], from: number, to: number, iterator: SpanIterator<T>,
    /**
    When given and greater than -1, only points of at least this
    size are taken into account.
    */
    minPointSize?: number): number;
    /**
    Create a range set for the given range or array of ranges. By
    default, this expects the ranges to be _sorted_ (by start
    position and, if two start at the same position,
    `value.startSide`). You can pass `true` as second argument to
    cause the method to sort them.
    */
    static of<T extends RangeValue>(ranges: readonly Range<T>[] | Range<T>, sort?: boolean): RangeSet<T>;
    /**
    The empty set of ranges.
    */
    static empty: RangeSet<any>;
}
/**
A range set builder is a data structure that helps build up a
[range set](https://codemirror.net/6/docs/ref/#state.RangeSet) directly, without first allocating
an array of [`Range`](https://codemirror.net/6/docs/ref/#state.Range) objects.
*/
declare class RangeSetBuilder<T extends RangeValue> {
    private chunks;
    private chunkPos;
    private chunkStart;
    private last;
    private lastFrom;
    private lastTo;
    private from;
    private to;
    private value;
    private maxPoint;
    private setMaxPoint;
    private nextLayer;
    private finishChunk;
    /**
    Create an empty builder.
    */
    constructor();
    /**
    Add a range. Ranges should be added in sorted (by `from` and
    `value.startSide`) order.
    */
    add(from: number, to: number, value: T): void;
    /**
    Finish the range set. Returns the new set. The builder can't be
    used anymore after this has been called.
    */
    finish(): RangeSet<T>;
}

declare class StyleModule {
  constructor(spec: {[selector: string]: StyleSpec}, options?: {
    finish?(sel: string): string
  })
  getRules(): string
  static mount(root: Document | ShadowRoot | DocumentOrShadowRoot, module: StyleModule | ReadonlyArray<StyleModule>): void
  static newName(): string
}

type StyleSpec = {
  [propOrSelector: string]: string | number | StyleSpec | null
}

declare type Attrs = {
    [name: string]: string;
};

interface MarkDecorationSpec {
    /**
    Whether the mark covers its start and end position or not. This
    influences whether content inserted at those positions becomes
    part of the mark. Defaults to false.
    */
    inclusive?: boolean;
    /**
    Specify whether the start position of the marked range should be
    inclusive. Overrides `inclusive`, when both are present.
    */
    inclusiveStart?: boolean;
    /**
    Whether the end should be inclusive.
    */
    inclusiveEnd?: boolean;
    /**
    Add attributes to the DOM elements that hold the text in the
    marked range.
    */
    attributes?: {
        [key: string]: string;
    };
    /**
    Shorthand for `{attributes: {class: value}}`.
    */
    class?: string;
    /**
    Add a wrapping element around the text in the marked range. Note
    that there will not necessarily be a single element covering the
    entire range—other decorations with lower precedence might split
    this one if they partially overlap it, and line breaks always
    end decoration elements.
    */
    tagName?: string;
    /**
    Decoration specs allow extra properties, which can be retrieved
    through the decoration's [`spec`](https://codemirror.net/6/docs/ref/#view.Decoration.spec)
    property.
    */
    [other: string]: any;
}
interface WidgetDecorationSpec {
    /**
    The type of widget to draw here.
    */
    widget: WidgetType;
    /**
    Which side of the given position the widget is on. When this is
    positive, the widget will be drawn after the cursor if the
    cursor is on the same position. Otherwise, it'll be drawn before
    it. When multiple widgets sit at the same position, their `side`
    values will determine their ordering—those with a lower value
    come first. Defaults to 0.
    */
    side?: number;
    /**
    Determines whether this is a block widgets, which will be drawn
    between lines, or an inline widget (the default) which is drawn
    between the surrounding text.

    Note that block-level decorations should not have vertical
    margins, and if you dynamically change their height, you should
    make sure to call
    [`requestMeasure`](https://codemirror.net/6/docs/ref/#view.EditorView.requestMeasure), so that the
    editor can update its information about its vertical layout.
    */
    block?: boolean;
    /**
    Other properties are allowed.
    */
    [other: string]: any;
}
interface ReplaceDecorationSpec {
    /**
    An optional widget to drawn in the place of the replaced
    content.
    */
    widget?: WidgetType;
    /**
    Whether this range covers the positions on its sides. This
    influences whether new content becomes part of the range and
    whether the cursor can be drawn on its sides. Defaults to false
    for inline replacements, and true for block replacements.
    */
    inclusive?: boolean;
    /**
    Set inclusivity at the start.
    */
    inclusiveStart?: boolean;
    /**
    Set inclusivity at the end.
    */
    inclusiveEnd?: boolean;
    /**
    Whether this is a block-level decoration. Defaults to false.
    */
    block?: boolean;
    /**
    Other properties are allowed.
    */
    [other: string]: any;
}
interface LineDecorationSpec {
    /**
    DOM attributes to add to the element wrapping the line.
    */
    attributes?: {
        [key: string]: string;
    };
    /**
    Shorthand for `{attributes: {class: value}}`.
    */
    class?: string;
    /**
    Other properties are allowed.
    */
    [other: string]: any;
}
/**
Widgets added to the content are described by subclasses of this
class. Using a description object like that makes it possible to
delay creating of the DOM structure for a widget until it is
needed, and to avoid redrawing widgets even if the decorations
that define them are recreated.
*/
declare abstract class WidgetType {
    /**
    Build the DOM structure for this widget instance.
    */
    abstract toDOM(view: EditorView): HTMLElement;
    /**
    Compare this instance to another instance of the same type.
    (TypeScript can't express this, but only instances of the same
    specific class will be passed to this method.) This is used to
    avoid redrawing widgets when they are replaced by a new
    decoration of the same type. The default implementation just
    returns `false`, which will cause new instances of the widget to
    always be redrawn.
    */
    eq(widget: WidgetType): boolean;
    /**
    Update a DOM element created by a widget of the same type (but
    different, non-`eq` content) to reflect this widget. May return
    true to indicate that it could update, false to indicate it
    couldn't (in which case the widget will be redrawn). The default
    implementation just returns false.
    */
    updateDOM(dom: HTMLElement, view: EditorView): boolean;
    /**
    The estimated height this widget will have, to be used when
    estimating the height of content that hasn't been drawn. May
    return -1 to indicate you don't know. The default implementation
    returns -1.
    */
    get estimatedHeight(): number;
    /**
    Can be used to configure which kinds of events inside the widget
    should be ignored by the editor. The default is to ignore all
    events.
    */
    ignoreEvent(event: Event): boolean;
    /**
    This is called when the an instance of the widget is removed
    from the editor view.
    */
    destroy(dom: HTMLElement): void;
}
/**
A decoration set represents a collection of decorated ranges,
organized for efficient access and mapping. See
[`RangeSet`](https://codemirror.net/6/docs/ref/#state.RangeSet) for its methods.
*/
declare type DecorationSet = RangeSet<Decoration>;
/**
The different types of blocks that can occur in an editor view.
*/
declare enum BlockType {
    /**
    A line of text.
    */
    Text = 0,
    /**
    A block widget associated with the position after it.
    */
    WidgetBefore = 1,
    /**
    A block widget associated with the position before it.
    */
    WidgetAfter = 2,
    /**
    A block widget [replacing](https://codemirror.net/6/docs/ref/#view.Decoration^replace) a range of content.
    */
    WidgetRange = 3
}
/**
A decoration provides information on how to draw or style a piece
of content. You'll usually use it wrapped in a
[`Range`](https://codemirror.net/6/docs/ref/#state.Range), which adds a start and end position.
@nonabstract
*/
declare abstract class Decoration extends RangeValue {
    /**
    The config object used to create this decoration. You can
    include additional properties in there to store metadata about
    your decoration.
    */
    readonly spec: any;
    protected constructor(
    /**
    @internal
    */
    startSide: number,
    /**
    @internal
    */
    endSide: number,
    /**
    @internal
    */
    widget: WidgetType | null,
    /**
    The config object used to create this decoration. You can
    include additional properties in there to store metadata about
    your decoration.
    */
    spec: any);
    abstract eq(other: Decoration): boolean;
    /**
    Create a mark decoration, which influences the styling of the
    content in its range. Nested mark decorations will cause nested
    DOM elements to be created. Nesting order is determined by
    precedence of the [facet](https://codemirror.net/6/docs/ref/#view.EditorView^decorations), with
    the higher-precedence decorations creating the inner DOM nodes.
    Such elements are split on line boundaries and on the boundaries
    of lower-precedence decorations.
    */
    static mark(spec: MarkDecorationSpec): Decoration;
    /**
    Create a widget decoration, which displays a DOM element at the
    given position.
    */
    static widget(spec: WidgetDecorationSpec): Decoration;
    /**
    Create a replace decoration which replaces the given range with
    a widget, or simply hides it.
    */
    static replace(spec: ReplaceDecorationSpec): Decoration;
    /**
    Create a line decoration, which can add DOM attributes to the
    line starting at the given position.
    */
    static line(spec: LineDecorationSpec): Decoration;
    /**
    Build a [`DecorationSet`](https://codemirror.net/6/docs/ref/#view.DecorationSet) from the given
    decorated range or ranges. If the ranges aren't already sorted,
    pass `true` for `sort` to make the library sort them for you.
    */
    static set(of: Range<Decoration> | readonly Range<Decoration>[], sort?: boolean): DecorationSet;
    /**
    The empty set of decorations.
    */
    static none: DecorationSet;
}

/**
Basic rectangle type.
*/
interface Rect {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
}
declare type ScrollStrategy = "nearest" | "start" | "end" | "center";

/**
Command functions are used in key bindings and other types of user
actions. Given an editor view, they check whether their effect can
apply to the editor, and if it can, perform it as a side effect
(which usually means [dispatching](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) a
transaction) and return `true`.
*/
declare type Command = (target: EditorView) => boolean;
/**
This is the interface plugin objects conform to.
*/
interface PluginValue extends Object {
    /**
    Notifies the plugin of an update that happened in the view. This
    is called _before_ the view updates its own DOM. It is
    responsible for updating the plugin's internal state (including
    any state that may be read by plugin fields) and _writing_ to
    the DOM for the changes in the update. To avoid unnecessary
    layout recomputations, it should _not_ read the DOM layout—use
    [`requestMeasure`](https://codemirror.net/6/docs/ref/#view.EditorView.requestMeasure) to schedule
    your code in a DOM reading phase if you need to.
    */
    update?(update: ViewUpdate): void;
    /**
    Called when the plugin is no longer going to be used. Should
    revert any changes the plugin made to the DOM.
    */
    destroy?(): void;
}
/**
Provides additional information when defining a [view
plugin](https://codemirror.net/6/docs/ref/#view.ViewPlugin).
*/
interface PluginSpec<V extends PluginValue> {
    /**
    Register the given [event
    handlers](https://codemirror.net/6/docs/ref/#view.EditorView^domEventHandlers) for the plugin.
    When called, these will have their `this` bound to the plugin
    value.
    */
    eventHandlers?: DOMEventHandlers<V>;
    /**
    Specify that the plugin provides additional extensions when
    added to an editor configuration.
    */
    provide?: (plugin: ViewPlugin<V>) => Extension;
    /**
    Allow the plugin to provide decorations. When given, this should
    be a function that take the plugin value and return a
    [decoration set](https://codemirror.net/6/docs/ref/#view.DecorationSet). See also the caveat about
    [layout-changing decorations](https://codemirror.net/6/docs/ref/#view.EditorView^decorations) that
    depend on the view.
    */
    decorations?: (value: V) => DecorationSet;
}
/**
View plugins associate stateful values with a view. They can
influence the way the content is drawn, and are notified of things
that happen in the view.
*/
declare class ViewPlugin<V extends PluginValue> {
    /**
    Instances of this class act as extensions.
    */
    extension: Extension;
    private constructor();
    /**
    Define a plugin from a constructor function that creates the
    plugin's value, given an editor view.
    */
    static define<V extends PluginValue>(create: (view: EditorView) => V, spec?: PluginSpec<V>): ViewPlugin<V>;
    /**
    Create a plugin for a class whose constructor takes a single
    editor view as argument.
    */
    static fromClass<V extends PluginValue>(cls: {
        new (view: EditorView): V;
    }, spec?: PluginSpec<V>): ViewPlugin<V>;
}
interface MeasureRequest<T> {
    /**
    Called in a DOM read phase to gather information that requires
    DOM layout. Should _not_ mutate the document.
    */
    read(view: EditorView): T;
    /**
    Called in a DOM write phase to update the document. Should _not_
    do anything that triggers DOM layout.
    */
    write?(measure: T, view: EditorView): void;
    /**
    When multiple requests with the same key are scheduled, only the
    last one will actually be ran.
    */
    key?: any;
}
declare type AttrSource = Attrs | ((view: EditorView) => Attrs | null);
/**
View [plugins](https://codemirror.net/6/docs/ref/#view.ViewPlugin) are given instances of this
class, which describe what happened, whenever the view is updated.
*/
declare class ViewUpdate {
    /**
    The editor view that the update is associated with.
    */
    readonly view: EditorView;
    /**
    The new editor state.
    */
    readonly state: EditorState;
    /**
    The transactions involved in the update. May be empty.
    */
    readonly transactions: readonly Transaction[];
    /**
    The changes made to the document by this update.
    */
    readonly changes: ChangeSet;
    /**
    The previous editor state.
    */
    readonly startState: EditorState;
    private constructor();
    /**
    Tells you whether the [viewport](https://codemirror.net/6/docs/ref/#view.EditorView.viewport) or
    [visible ranges](https://codemirror.net/6/docs/ref/#view.EditorView.visibleRanges) changed in this
    update.
    */
    get viewportChanged(): boolean;
    /**
    Indicates whether the height of a block element in the editor
    changed in this update.
    */
    get heightChanged(): boolean;
    /**
    Returns true when the document was modified or the size of the
    editor, or elements within the editor, changed.
    */
    get geometryChanged(): boolean;
    /**
    True when this update indicates a focus change.
    */
    get focusChanged(): boolean;
    /**
    Whether the document changed in this update.
    */
    get docChanged(): boolean;
    /**
    Whether the selection was explicitly set in this update.
    */
    get selectionSet(): boolean;
}

/**
Interface that objects registered with
[`EditorView.mouseSelectionStyle`](https://codemirror.net/6/docs/ref/#view.EditorView^mouseSelectionStyle)
must conform to.
*/
interface MouseSelectionStyle {
    /**
    Return a new selection for the mouse gesture that starts with
    the event that was originally given to the constructor, and ends
    with the event passed here. In case of a plain click, those may
    both be the `mousedown` event, in case of a drag gesture, the
    latest `mousemove` event will be passed.

    When `extend` is true, that means the new selection should, if
    possible, extend the start selection. If `multiple` is true, the
    new selection should be added to the original selection.
    */
    get: (curEvent: MouseEvent, extend: boolean, multiple: boolean) => EditorSelection;
    /**
    Called when the view is updated while the gesture is in
    progress. When the document changes, it may be necessary to map
    some data (like the original selection or start position)
    through the changes.

    This may return `true` to indicate that the `get` method should
    get queried again after the update, because something in the
    update could change its result. Be wary of infinite loops when
    using this (where `get` returns a new selection, which will
    trigger `update`, which schedules another `get` in response).
    */
    update: (update: ViewUpdate) => boolean | void;
}
declare type MakeSelectionStyle = (view: EditorView, event: MouseEvent) => MouseSelectionStyle | null;

/**
Record used to represent information about a block-level element
in the editor view.
*/
declare class BlockInfo {
    /**
    The start of the element in the document.
    */
    readonly from: number;
    /**
    The length of the element.
    */
    readonly length: number;
    /**
    The top position of the element (relative to the top of the
    document).
    */
    readonly top: number;
    /**
    Its height.
    */
    readonly height: number;
    /**
    The type of element this is. When querying lines, this may be
    an array of all the blocks that make up the line.
    */
    readonly type: BlockType | readonly BlockInfo[];
    /**
    The end of the element as a document position.
    */
    get to(): number;
    /**
    The bottom position of the element.
    */
    get bottom(): number;
}

/**
Used to indicate [text direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection).
*/
declare enum Direction {
    /**
    Left-to-right.
    */
    LTR = 0,
    /**
    Right-to-left.
    */
    RTL = 1
}
/**
Represents a contiguous range of text that has a single direction
(as in left-to-right or right-to-left).
*/
declare class BidiSpan {
    /**
    The start of the span (relative to the start of the line).
    */
    readonly from: number;
    /**
    The end of the span.
    */
    readonly to: number;
    /**
    The ["bidi
    level"](https://unicode.org/reports/tr9/#Basic_Display_Algorithm)
    of the span (in this context, 0 means
    left-to-right, 1 means right-to-left, 2 means left-to-right
    number inside right-to-left text).
    */
    readonly level: number;
    /**
    The direction of this span.
    */
    get dir(): Direction;
}

/**
The type of object given to the [`EditorView`](https://codemirror.net/6/docs/ref/#view.EditorView)
constructor.
*/
interface EditorViewConfig extends EditorStateConfig {
    /**
    The view's initial state. If not given, a new state is created
    by passing this configuration object to
    [`EditorState.create`](https://codemirror.net/6/docs/ref/#state.EditorState^create), using its
    `doc`, `selection`, and `extensions` field (if provided).
    */
    state?: EditorState;
    /**
    When given, the editor is immediately appended to the given
    element on creation. (Otherwise, you'll have to place the view's
    [`dom`](https://codemirror.net/6/docs/ref/#view.EditorView.dom) element in the document yourself.)
    */
    parent?: Element | DocumentFragment;
    /**
    If the view is going to be mounted in a shadow root or document
    other than the one held by the global variable `document` (the
    default), you should pass it here. If you provide `parent`, but
    not this option, the editor will automatically look up a root
    from the parent.
    */
    root?: Document | ShadowRoot;
    /**
    Override the transaction [dispatch
    function](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) for this editor view, which
    is the way updates get routed to the view. Your implementation,
    if provided, should probably call the view's [`update`
    method](https://codemirror.net/6/docs/ref/#view.EditorView.update).
    */
    dispatch?: (tr: Transaction) => void;
}
/**
An editor view represents the editor's user interface. It holds
the editable DOM surface, and possibly other elements such as the
line number gutter. It handles events and dispatches state
transactions for editing actions.
*/
declare class EditorView {
    /**
    The current editor state.
    */
    get state(): EditorState;
    /**
    To be able to display large documents without consuming too much
    memory or overloading the browser, CodeMirror only draws the
    code that is visible (plus a margin around it) to the DOM. This
    property tells you the extent of the current drawn viewport, in
    document positions.
    */
    get viewport(): {
        from: number;
        to: number;
    };
    /**
    When there are, for example, large collapsed ranges in the
    viewport, its size can be a lot bigger than the actual visible
    content. Thus, if you are doing something like styling the
    content in the viewport, it is preferable to only do so for
    these ranges, which are the subset of the viewport that is
    actually drawn.
    */
    get visibleRanges(): readonly {
        from: number;
        to: number;
    }[];
    /**
    Returns false when the editor is entirely scrolled out of view
    or otherwise hidden.
    */
    get inView(): boolean;
    /**
    Indicates whether the user is currently composing text via
    [IME](https://en.wikipedia.org/wiki/Input_method), and at least
    one change has been made in the current composition.
    */
    get composing(): boolean;
    /**
    Indicates whether the user is currently in composing state. Note
    that on some platforms, like Android, this will be the case a
    lot, since just putting the cursor on a word starts a
    composition there.
    */
    get compositionStarted(): boolean;
    private _dispatch;
    private _root;
    /**
    The document or shadow root that the view lives in.
    */
    get root(): DocumentOrShadowRoot;
    /**
    The DOM element that wraps the entire editor view.
    */
    readonly dom: HTMLElement;
    /**
    The DOM element that can be styled to scroll. (Note that it may
    not have been, so you can't assume this is scrollable.)
    */
    readonly scrollDOM: HTMLElement;
    /**
    The editable DOM element holding the editor content. You should
    not, usually, interact with this content directly though the
    DOM, since the editor will immediately undo most of the changes
    you make. Instead, [dispatch](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch)
    [transactions](https://codemirror.net/6/docs/ref/#state.Transaction) to modify content, and
    [decorations](https://codemirror.net/6/docs/ref/#view.Decoration) to style it.
    */
    readonly contentDOM: HTMLElement;
    private announceDOM;
    private plugins;
    private pluginMap;
    private editorAttrs;
    private contentAttrs;
    private styleModules;
    private bidiCache;
    private destroyed;
    /**
    Construct a new view. You'll want to either provide a `parent`
    option, or put `view.dom` into your document after creating a
    view, so that the user can see the editor.
    */
    constructor(config?: EditorViewConfig);
    /**
    All regular editor state updates should go through this. It
    takes a transaction or transaction spec and updates the view to
    show the new state produced by that transaction. Its
    implementation can be overridden with an
    [option](https://codemirror.net/6/docs/ref/#view.EditorView.constructor^config.dispatch). This
    function is bound to the view instance, so it does not have to
    be called as a method.
    */
    dispatch(tr: Transaction): void;
    dispatch(...specs: TransactionSpec[]): void;
    /**
    Update the view for the given array of transactions. This will
    update the visible document and selection to match the state
    produced by the transactions, and notify view plugins of the
    change. You should usually call
    [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead, which uses this
    as a primitive.
    */
    update(transactions: readonly Transaction[]): void;
    /**
    Reset the view to the given state. (This will cause the entire
    document to be redrawn and all view plugins to be reinitialized,
    so you should probably only use it when the new state isn't
    derived from the old state. Otherwise, use
    [`dispatch`](https://codemirror.net/6/docs/ref/#view.EditorView.dispatch) instead.)
    */
    setState(newState: EditorState): void;
    private updatePlugins;
    /**
    Get the CSS classes for the currently active editor themes.
    */
    get themeClasses(): string;
    private updateAttrs;
    private showAnnouncements;
    private mountStyles;
    private readMeasured;
    /**
    Schedule a layout measurement, optionally providing callbacks to
    do custom DOM measuring followed by a DOM write phase. Using
    this is preferable reading DOM layout directly from, for
    example, an event handler, because it'll make sure measuring and
    drawing done by other components is synchronized, avoiding
    unnecessary DOM layout computations.
    */
    requestMeasure<T>(request?: MeasureRequest<T>): void;
    /**
    Get the value of a specific plugin, if present. Note that
    plugins that crash can be dropped from a view, so even when you
    know you registered a given plugin, it is recommended to check
    the return value of this method.
    */
    plugin<T extends PluginValue>(plugin: ViewPlugin<T>): T | null;
    /**
    The top position of the document, in screen coordinates. This
    may be negative when the editor is scrolled down. Points
    directly to the top of the first line, not above the padding.
    */
    get documentTop(): number;
    /**
    Reports the padding above and below the document.
    */
    get documentPadding(): {
        top: number;
        bottom: number;
    };
    /**
    Find the text line or block widget at the given vertical
    position (which is interpreted as relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop)).
    */
    elementAtHeight(height: number): BlockInfo;
    /**
    Find the line block (see
    [`lineBlockAt`](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt) at the given
    height, again interpreted relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop).
    */
    lineBlockAtHeight(height: number): BlockInfo;
    /**
    Get the extent and vertical position of all [line
    blocks](https://codemirror.net/6/docs/ref/#view.EditorView.lineBlockAt) in the viewport. Positions
    are relative to the [top of the
    document](https://codemirror.net/6/docs/ref/#view.EditorView.documentTop);
    */
    get viewportLineBlocks(): BlockInfo[];
    /**
    Find the line block around the given document position. A line
    block is a range delimited on both sides by either a
    non-[hidden](https://codemirror.net/6/docs/ref/#view.Decoration^replace) line breaks, or the
    start/end of the document. It will usually just hold a line of
    text, but may be broken into multiple textblocks by block
    widgets.
    */
    lineBlockAt(pos: number): BlockInfo;
    /**
    The editor's total content height.
    */
    get contentHeight(): number;
    /**
    Move a cursor position by [grapheme
    cluster](https://codemirror.net/6/docs/ref/#state.findClusterBreak). `forward` determines whether
    the motion is away from the line start, or towards it. In
    bidirectional text, the line is traversed in visual order, using
    the editor's [text direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection).
    When the start position was the last one on the line, the
    returned position will be across the line break. If there is no
    further line, the original position is returned.

    By default, this method moves over a single cluster. The
    optional `by` argument can be used to move across more. It will
    be called with the first cluster as argument, and should return
    a predicate that determines, for each subsequent cluster,
    whether it should also be moved over.
    */
    moveByChar(start: SelectionRange, forward: boolean, by?: (initial: string) => (next: string) => boolean): SelectionRange;
    /**
    Move a cursor position across the next group of either
    [letters](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer) or non-letter
    non-whitespace characters.
    */
    moveByGroup(start: SelectionRange, forward: boolean): SelectionRange;
    /**
    Move to the next line boundary in the given direction. If
    `includeWrap` is true, line wrapping is on, and there is a
    further wrap point on the current line, the wrap point will be
    returned. Otherwise this function will return the start or end
    of the line.
    */
    moveToLineBoundary(start: SelectionRange, forward: boolean, includeWrap?: boolean): SelectionRange;
    /**
    Move a cursor position vertically. When `distance` isn't given,
    it defaults to moving to the next line (including wrapped
    lines). Otherwise, `distance` should provide a positive distance
    in pixels.

    When `start` has a
    [`goalColumn`](https://codemirror.net/6/docs/ref/#state.SelectionRange.goalColumn), the vertical
    motion will use that as a target horizontal position. Otherwise,
    the cursor's own horizontal position is used. The returned
    cursor will have its goal column set to whichever column was
    used.
    */
    moveVertically(start: SelectionRange, forward: boolean, distance?: number): SelectionRange;
    /**
    Find the DOM parent node and offset (child offset if `node` is
    an element, character offset when it is a text node) at the
    given document position.

    Note that for positions that aren't currently in
    `visibleRanges`, the resulting DOM position isn't necessarily
    meaningful (it may just point before or after a placeholder
    element).
    */
    domAtPos(pos: number): {
        node: Node;
        offset: number;
    };
    /**
    Find the document position at the given DOM node. Can be useful
    for associating positions with DOM events. Will raise an error
    when `node` isn't part of the editor content.
    */
    posAtDOM(node: Node, offset?: number): number;
    /**
    Get the document position at the given screen coordinates. For
    positions not covered by the visible viewport's DOM structure,
    this will return null, unless `false` is passed as second
    argument, in which case it'll return an estimated position that
    would be near the coordinates if it were rendered.
    */
    posAtCoords(coords: {
        x: number;
        y: number;
    }, precise: false): number;
    posAtCoords(coords: {
        x: number;
        y: number;
    }): number | null;
    /**
    Get the screen coordinates at the given document position.
    `side` determines whether the coordinates are based on the
    element before (-1) or after (1) the position (if no element is
    available on the given side, the method will transparently use
    another strategy to get reasonable coordinates).
    */
    coordsAtPos(pos: number, side?: -1 | 1): Rect | null;
    /**
    The default width of a character in the editor. May not
    accurately reflect the width of all characters (given variable
    width fonts or styling of invididual ranges).
    */
    get defaultCharacterWidth(): number;
    /**
    The default height of a line in the editor. May not be accurate
    for all lines.
    */
    get defaultLineHeight(): number;
    /**
    The text direction
    ([`direction`](https://developer.mozilla.org/en-US/docs/Web/CSS/direction)
    CSS property) of the editor's content element.
    */
    get textDirection(): Direction;
    /**
    Find the text direction of the block at the given position, as
    assigned by CSS. If
    [`perLineTextDirection`](https://codemirror.net/6/docs/ref/#view.EditorView^perLineTextDirection)
    isn't enabled, or the given position is outside of the viewport,
    this will always return the same as
    [`textDirection`](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection). Note that
    this may trigger a DOM layout.
    */
    textDirectionAt(pos: number): Direction;
    /**
    Whether this editor [wraps lines](https://codemirror.net/6/docs/ref/#view.EditorView.lineWrapping)
    (as determined by the
    [`white-space`](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space)
    CSS property of its content element).
    */
    get lineWrapping(): boolean;
    /**
    Returns the bidirectional text structure of the given line
    (which should be in the current document) as an array of span
    objects. The order of these spans matches the [text
    direction](https://codemirror.net/6/docs/ref/#view.EditorView.textDirection)—if that is
    left-to-right, the leftmost spans come first, otherwise the
    rightmost spans come first.
    */
    bidiSpans(line: Line$1): readonly BidiSpan[];
    /**
    Check whether the editor has focus.
    */
    get hasFocus(): boolean;
    /**
    Put focus on the editor.
    */
    focus(): void;
    /**
    Update the [root](https://codemirror.net/6/docs/ref/##view.EditorViewConfig.root) in which the editor lives. This is only
    necessary when moving the editor's existing DOM to a new window or shadow root.
    */
    setRoot(root: Document | ShadowRoot): void;
    /**
    Clean up this editor view, removing its element from the
    document, unregistering event handlers, and notifying
    plugins. The view instance can no longer be used after
    calling this.
    */
    destroy(): void;
    /**
    Returns an effect that can be
    [added](https://codemirror.net/6/docs/ref/#state.TransactionSpec.effects) to a transaction to
    cause it to scroll the given position or range into view.
    */
    static scrollIntoView(pos: number | SelectionRange, options?: {
        /**
        By default (`"nearest"`) the position will be vertically
        scrolled only the minimal amount required to move the given
        position into view. You can set this to `"start"` to move it
        to the top of the view, `"end"` to move it to the bottom, or
        `"center"` to move it to the center.
        */
        y?: ScrollStrategy;
        /**
        Effect similar to
        [`y`](https://codemirror.net/6/docs/ref/#view.EditorView^scrollIntoView^options.y), but for the
        horizontal scroll position.
        */
        x?: ScrollStrategy;
        /**
        Extra vertical distance to add when moving something into
        view. Not used with the `"center"` strategy. Defaults to 5.
        */
        yMargin?: number;
        /**
        Extra horizontal distance to add. Not used with the `"center"`
        strategy. Defaults to 5.
        */
        xMargin?: number;
    }): StateEffect<unknown>;
    /**
    Facet to add a [style
    module](https://github.com/marijnh/style-mod#documentation) to
    an editor view. The view will ensure that the module is
    mounted in its [document
    root](https://codemirror.net/6/docs/ref/#view.EditorView.constructor^config.root).
    */
    static styleModule: Facet<StyleModule, readonly StyleModule[]>;
    /**
    Returns an extension that can be used to add DOM event handlers.
    The value should be an object mapping event names to handler
    functions. For any given event, such functions are ordered by
    extension precedence, and the first handler to return true will
    be assumed to have handled that event, and no other handlers or
    built-in behavior will be activated for it. These are registered
    on the [content element](https://codemirror.net/6/docs/ref/#view.EditorView.contentDOM), except
    for `scroll` handlers, which will be called any time the
    editor's [scroll element](https://codemirror.net/6/docs/ref/#view.EditorView.scrollDOM) or one of
    its parent nodes is scrolled.
    */
    static domEventHandlers(handlers: DOMEventHandlers<any>): Extension;
    /**
    An input handler can override the way changes to the editable
    DOM content are handled. Handlers are passed the document
    positions between which the change was found, and the new
    content. When one returns true, no further input handlers are
    called and the default behavior is prevented.
    */
    static inputHandler: Facet<(view: EditorView, from: number, to: number, text: string) => boolean, readonly ((view: EditorView, from: number, to: number, text: string) => boolean)[]>;
    /**
    This facet can be used to provide functions that create effects
    to be dispatched when the editor's focus state changes.
    */
    static focusChangeEffect: Facet<(state: EditorState, focusing: boolean) => StateEffect<any> | null, readonly ((state: EditorState, focusing: boolean) => StateEffect<any> | null)[]>;
    /**
    By default, the editor assumes all its content has the same
    [text direction](https://codemirror.net/6/docs/ref/#view.Direction). Configure this with a `true`
    value to make it read the text direction of every (rendered)
    line separately.
    */
    static perLineTextDirection: Facet<boolean, boolean>;
    /**
    Allows you to provide a function that should be called when the
    library catches an exception from an extension (mostly from view
    plugins, but may be used by other extensions to route exceptions
    from user-code-provided callbacks). This is mostly useful for
    debugging and logging. See [`logException`](https://codemirror.net/6/docs/ref/#view.logException).
    */
    static exceptionSink: Facet<(exception: any) => void, readonly ((exception: any) => void)[]>;
    /**
    A facet that can be used to register a function to be called
    every time the view updates.
    */
    static updateListener: Facet<(update: ViewUpdate) => void, readonly ((update: ViewUpdate) => void)[]>;
    /**
    Facet that controls whether the editor content DOM is editable.
    When its highest-precedence value is `false`, the element will
    not have its `contenteditable` attribute set. (Note that this
    doesn't affect API calls that change the editor content, even
    when those are bound to keys or buttons. See the
    [`readOnly`](https://codemirror.net/6/docs/ref/#state.EditorState.readOnly) facet for that.)
    */
    static editable: Facet<boolean, boolean>;
    /**
    Allows you to influence the way mouse selection happens. The
    functions in this facet will be called for a `mousedown` event
    on the editor, and can return an object that overrides the way a
    selection is computed from that mouse click or drag.
    */
    static mouseSelectionStyle: Facet<MakeSelectionStyle, readonly MakeSelectionStyle[]>;
    /**
    Facet used to configure whether a given selection drag event
    should move or copy the selection. The given predicate will be
    called with the `mousedown` event, and can return `true` when
    the drag should move the content.
    */
    static dragMovesSelection: Facet<(event: MouseEvent) => boolean, readonly ((event: MouseEvent) => boolean)[]>;
    /**
    Facet used to configure whether a given selecting click adds a
    new range to the existing selection or replaces it entirely. The
    default behavior is to check `event.metaKey` on macOS, and
    `event.ctrlKey` elsewhere.
    */
    static clickAddsSelectionRange: Facet<(event: MouseEvent) => boolean, readonly ((event: MouseEvent) => boolean)[]>;
    /**
    A facet that determines which [decorations](https://codemirror.net/6/docs/ref/#view.Decoration)
    are shown in the view. Decorations can be provided in two
    ways—directly, or via a function that takes an editor view.

    Only decoration sets provided directly are allowed to influence
    the editor's vertical layout structure. The ones provided as
    functions are called _after_ the new viewport has been computed,
    and thus **must not** introduce block widgets or replacing
    decorations that cover line breaks.

    If you want decorated ranges to behave like atomic units for
    cursor motion and deletion purposes, also provide the range set
    containing the decorations to
    [`EditorView.atomicRanges`](https://codemirror.net/6/docs/ref/#view.EditorView^atomicRanges).
    */
    static decorations: Facet<DecorationSet | ((view: EditorView) => DecorationSet), readonly (DecorationSet | ((view: EditorView) => DecorationSet))[]>;
    /**
    Used to provide ranges that should be treated as atoms as far as
    cursor motion is concerned. This causes methods like
    [`moveByChar`](https://codemirror.net/6/docs/ref/#view.EditorView.moveByChar) and
    [`moveVertically`](https://codemirror.net/6/docs/ref/#view.EditorView.moveVertically) (and the
    commands built on top of them) to skip across such regions when
    a selection endpoint would enter them. This does _not_ prevent
    direct programmatic [selection
    updates](https://codemirror.net/6/docs/ref/#state.TransactionSpec.selection) from moving into such
    regions.
    */
    static atomicRanges: Facet<(view: EditorView) => RangeSet<any>, readonly ((view: EditorView) => RangeSet<any>)[]>;
    /**
    Facet that allows extensions to provide additional scroll
    margins (space around the sides of the scrolling element that
    should be considered invisible). This can be useful when the
    plugin introduces elements that cover part of that element (for
    example a horizontally fixed gutter).
    */
    static scrollMargins: Facet<(view: EditorView) => Partial<Rect> | null, readonly ((view: EditorView) => Partial<Rect> | null)[]>;
    /**
    Create a theme extension. The first argument can be a
    [`style-mod`](https://github.com/marijnh/style-mod#documentation)
    style spec providing the styles for the theme. These will be
    prefixed with a generated class for the style.

    Because the selectors will be prefixed with a scope class, rule
    that directly match the editor's [wrapper
    element](https://codemirror.net/6/docs/ref/#view.EditorView.dom)—to which the scope class will be
    added—need to be explicitly differentiated by adding an `&` to
    the selector for that element—for example
    `&.cm-focused`.

    When `dark` is set to true, the theme will be marked as dark,
    which will cause the `&dark` rules from [base
    themes](https://codemirror.net/6/docs/ref/#view.EditorView^baseTheme) to be used (as opposed to
    `&light` when a light theme is active).
    */
    static theme(spec: {
        [selector: string]: StyleSpec;
    }, options?: {
        dark?: boolean;
    }): Extension;
    /**
    This facet records whether a dark theme is active. The extension
    returned by [`theme`](https://codemirror.net/6/docs/ref/#view.EditorView^theme) automatically
    includes an instance of this when the `dark` option is set to
    true.
    */
    static darkTheme: Facet<boolean, boolean>;
    /**
    Create an extension that adds styles to the base theme. Like
    with [`theme`](https://codemirror.net/6/docs/ref/#view.EditorView^theme), use `&` to indicate the
    place of the editor wrapper element when directly targeting
    that. You can also use `&dark` or `&light` instead to only
    target editors with a dark or light theme.
    */
    static baseTheme(spec: {
        [selector: string]: StyleSpec;
    }): Extension;
    /**
    Facet that provides additional DOM attributes for the editor's
    editable DOM element.
    */
    static contentAttributes: Facet<AttrSource, readonly AttrSource[]>;
    /**
    Facet that provides DOM attributes for the editor's outer
    element.
    */
    static editorAttributes: Facet<AttrSource, readonly AttrSource[]>;
    /**
    An extension that enables line wrapping in the editor (by
    setting CSS `white-space` to `pre-wrap` in the content).
    */
    static lineWrapping: Extension;
    /**
    State effect used to include screen reader announcements in a
    transaction. These will be added to the DOM in a visually hidden
    element with `aria-live="polite"` set, and should be used to
    describe effects that are visually obvious but may not be
    noticed by screen reader users (such as moving to the next
    search match).
    */
    static announce: StateEffectType<string>;
    /**
    Retrieve an editor view instance from the view's DOM
    representation.
    */
    static findFromDOM(dom: HTMLElement): EditorView | null;
}
/**
Helper type that maps event names to event object types, or the
`any` type for unknown events.
*/
interface DOMEventMap extends HTMLElementEventMap {
    [other: string]: any;
}
/**
Event handlers are specified with objects like this. For event
types known by TypeScript, this will infer the event argument type
to hold the appropriate event object type. For unknown events, it
is inferred to `any`, and should be explicitly set if you want type
checking.
*/
declare type DOMEventHandlers<This> = {
    [event in keyof DOMEventMap]?: (this: This, event: DOMEventMap[event], view: EditorView) => boolean | void;
};

/**
Key bindings associate key names with
[command](https://codemirror.net/6/docs/ref/#view.Command)-style functions.

Key names may be strings like `"Shift-Ctrl-Enter"`—a key identifier
prefixed with zero or more modifiers. Key identifiers are based on
the strings that can appear in
[`KeyEvent.key`](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key).
Use lowercase letters to refer to letter keys (or uppercase letters
if you want shift to be held). You may use `"Space"` as an alias
for the `" "` name.

Modifiers can be given in any order. `Shift-` (or `s-`), `Alt-` (or
`a-`), `Ctrl-` (or `c-` or `Control-`) and `Cmd-` (or `m-` or
`Meta-`) are recognized.

When a key binding contains multiple key names separated by
spaces, it represents a multi-stroke binding, which will fire when
the user presses the given keys after each other.

You can use `Mod-` as a shorthand for `Cmd-` on Mac and `Ctrl-` on
other platforms. So `Mod-b` is `Ctrl-b` on Linux but `Cmd-b` on
macOS.
*/
interface KeyBinding {
    /**
    The key name to use for this binding. If the platform-specific
    property (`mac`, `win`, or `linux`) for the current platform is
    used as well in the binding, that one takes precedence. If `key`
    isn't defined and the platform-specific binding isn't either,
    a binding is ignored.
    */
    key?: string;
    /**
    Key to use specifically on macOS.
    */
    mac?: string;
    /**
    Key to use specifically on Windows.
    */
    win?: string;
    /**
    Key to use specifically on Linux.
    */
    linux?: string;
    /**
    The command to execute when this binding is triggered. When the
    command function returns `false`, further bindings will be tried
    for the key.
    */
    run?: Command;
    /**
    When given, this defines a second binding, using the (possibly
    platform-specific) key name prefixed with `Shift-` to activate
    this command.
    */
    shift?: Command;
    /**
    When this property is present, the function is called for every
    key that is not a multi-stroke prefix.
    */
    any?: (view: EditorView, event: KeyboardEvent) => boolean;
    /**
    By default, key bindings apply when focus is on the editor
    content (the `"editor"` scope). Some extensions, mostly those
    that define their own panels, might want to allow you to
    register bindings local to that panel. Such bindings should use
    a custom scope name. You may also assign multiple scope names to
    a binding, separating them by spaces.
    */
    scope?: string;
    /**
    When set to true (the default is false), this will always
    prevent the further handling for the bound key, even if the
    command(s) return false. This can be useful for cases where the
    native behavior of the key is annoying or irrelevant but the
    command doesn't always apply (such as, Mod-u for undo selection,
    which would cause the browser to view source instead when no
    selection can be undone).
    */
    preventDefault?: boolean;
}
/**
Facet used for registering keymaps.

You can add multiple keymaps to an editor. Their priorities
determine their precedence (the ones specified early or with high
priority get checked first). When a handler has returned `true`
for a given key, no further handlers are called.
*/
declare const keymap: Facet<readonly KeyBinding[], readonly (readonly KeyBinding[])[]>;

declare type SelectionConfig = {
    /**
    The length of a full cursor blink cycle, in milliseconds.
    Defaults to 1200. Can be set to 0 to disable blinking.
    */
    cursorBlinkRate?: number;
    /**
    Whether to show a cursor for non-empty ranges. Defaults to
    true.
    */
    drawRangeCursor?: boolean;
};
/**
Returns an extension that hides the browser's native selection and
cursor, replacing the selection with a background behind the text
(with the `cm-selectionBackground` class), and the
cursors with elements overlaid over the code (using
`cm-cursor-primary` and `cm-cursor-secondary`).

This allows the editor to display secondary selection ranges, and
tends to produce a type of selection more in line with that users
expect in a text editor (the native selection styling will often
leave gaps between lines and won't fill the horizontal space after
a line when the selection continues past it).

It does have a performance cost, in that it requires an extra DOM
layout cycle for many updates (the selection is drawn based on DOM
layout information that's only available after laying out the
content).
*/
declare function drawSelection(config?: SelectionConfig): Extension;

interface SpecialCharConfig {
    /**
    An optional function that renders the placeholder elements.

    The `description` argument will be text that clarifies what the
    character is, which should be provided to screen readers (for
    example with the
    [`aria-label`](https://www.w3.org/TR/wai-aria/#aria-label)
    attribute) and optionally shown to the user in other ways (such
    as the
    [`title`](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/title)
    attribute).

    The given placeholder string is a suggestion for how to display
    the character visually.
    */
    render?: ((code: number, description: string | null, placeholder: string) => HTMLElement) | null;
    /**
    Regular expression that matches the special characters to
    highlight. Must have its 'g'/global flag set.
    */
    specialChars?: RegExp;
    /**
    Regular expression that can be used to add characters to the
    default set of characters to highlight.
    */
    addSpecialChars?: RegExp | null;
}
/**
Returns an extension that installs highlighting of special
characters.
*/
declare function highlightSpecialChars(
/**
Configuration options.
*/
config?: SpecialCharConfig): Extension;

/**
Returns an extension that makes sure the content has a bottom
margin equivalent to the height of the editor, minus one line
height, so that every line in the document can be scrolled to the
top of the editor.

This is only meaningful when the editor is scrollable, and should
not be enabled in editors that take the size of their content.
*/
declare function scrollPastEnd(): Extension;

/**
Extension that enables a placeholder—a piece of example content
to show when the editor is empty.
*/
declare function placeholder(content: string | HTMLElement): Extension;

/**
Helper class used to make it easier to maintain decorations on
visible code that matches a given regular expression. To be used
in a [view plugin](https://codemirror.net/6/docs/ref/#view.ViewPlugin). Instances of this object
represent a matching configuration.
*/
declare class MatchDecorator {
    private regexp;
    private addMatch;
    private boundary;
    private maxLength;
    /**
    Create a decorator.
    */
    constructor(config: {
        /**
        The regular expression to match against the content. Will only
        be matched inside lines (not across them). Should have its 'g'
        flag set.
        */
        regexp: RegExp;
        /**
        The decoration to apply to matches, either directly or as a
        function of the match.
        */
        decoration?: Decoration | ((match: RegExpExecArray, view: EditorView, pos: number) => Decoration | null);
        /**
        Customize the way decorations are added for matches. This
        function, when given, will be called for matches and should
        call `add` to create decorations for them. Note that the
        decorations should appear *in* the given range, and the
        function should have no side effects beyond calling `add`.

        The `decoration` option is ignored when `decorate` is
        provided.
        */
        decorate?: (add: (from: number, to: number, decoration: Decoration) => void, from: number, to: number, match: RegExpExecArray, view: EditorView) => void;
        /**
        By default, changed lines are re-matched entirely. You can
        provide a boundary expression, which should match single
        character strings that can never occur in `regexp`, to reduce
        the amount of re-matching.
        */
        boundary?: RegExp;
        /**
        Matching happens by line, by default, but when lines are
        folded or very long lines are only partially drawn, the
        decorator may avoid matching part of them for speed. This
        controls how much additional invisible content it should
        include in its matches. Defaults to 1000.
        */
        maxLength?: number;
    });
    /**
    Compute the full set of decorations for matches in the given
    view's viewport. You'll want to call this when initializing your
    plugin.
    */
    createDeco(view: EditorView): RangeSet<Decoration>;
    /**
    Update a set of decorations for a view update. `deco` _must_ be
    the set of decorations produced by _this_ `MatchDecorator` for
    the view state before the update.
    */
    updateDeco(update: ViewUpdate, deco: DecorationSet): DecorationSet;
    private updateRange;
}

/**
Creates an extension that configures tooltip behavior.
*/
declare function tooltips(config?: {
    /**
    By default, tooltips use `"fixed"`
    [positioning](https://developer.mozilla.org/en-US/docs/Web/CSS/position),
    which has the advantage that tooltips don't get cut off by
    scrollable parent elements. However, CSS rules like `contain:
    layout` can break fixed positioning in child nodes, which can be
    worked about by using `"absolute"` here.

    On iOS, which at the time of writing still doesn't properly
    support fixed positioning, the library always uses absolute
    positioning.
    */
    position?: "fixed" | "absolute";
    /**
    The element to put the tooltips into. By default, they are put
    in the editor (`cm-editor`) element, and that is usually what
    you want. But in some layouts that can lead to positioning
    issues, and you need to use a different parent to work around
    those.
    */
    parent?: HTMLElement;
    /**
    By default, when figuring out whether there is room for a
    tooltip at a given position, the extension considers the entire
    space between 0,0 and `innerWidth`,`innerHeight` to be available
    for showing tooltips. You can provide a function here that
    returns an alternative rectangle.
    */
    tooltipSpace?: (view: EditorView) => Rect;
}): Extension;
/**
Describes a tooltip. Values of this type, when provided through
the [`showTooltip`](https://codemirror.net/6/docs/ref/#view.showTooltip) facet, control the
individual tooltips on the editor.
*/
interface Tooltip {
    /**
    The document position at which to show the tooltip.
    */
    pos: number;
    /**
    The end of the range annotated by this tooltip, if different
    from `pos`.
    */
    end?: number;
    /**
    A constructor function that creates the tooltip's [DOM
    representation](https://codemirror.net/6/docs/ref/#view.TooltipView).
    */
    create(view: EditorView): TooltipView;
    /**
    Whether the tooltip should be shown above or below the target
    position. Not guaranteed to be respected for hover tooltips
    since all hover tooltips for the same range are always
    positioned together. Defaults to false.
    */
    above?: boolean;
    /**
    Whether the `above` option should be honored when there isn't
    enough space on that side to show the tooltip inside the
    viewport. Defaults to false.
    */
    strictSide?: boolean;
    /**
    When set to true, show a triangle connecting the tooltip element
    to position `pos`.
    */
    arrow?: boolean;
}
/**
Describes the way a tooltip is displayed.
*/
interface TooltipView {
    /**
    The DOM element to position over the editor.
    */
    dom: HTMLElement;
    /**
    Adjust the position of the tooltip relative to its anchor
    position. A positive `x` value will move the tooltip
    horizontally along with the text direction (so right in
    left-to-right context, left in right-to-left). A positive `y`
    will move the tooltip up when it is above its anchor, and down
    otherwise.
    */
    offset?: {
        x: number;
        y: number;
    };
    /**
    By default, a tooltip's screen position will be based on the
    text position of its `pos` property. This method can be provided
    to make the tooltip view itself responsible for finding its
    screen position.
    */
    getCoords?: (pos: number) => Rect;
    /**
    By default, tooltips are moved when they overlap with other
    tooltips. Set this to `true` to disable that behavior for this
    tooltip.
    */
    overlap?: boolean;
    /**
    Called after the tooltip is added to the DOM for the first time.
    */
    mount?(view: EditorView): void;
    /**
    Update the DOM element for a change in the view's state.
    */
    update?(update: ViewUpdate): void;
    /**
    Called when the tooltip is removed from the editor or the editor
    is destroyed.
    */
    destroy?(): void;
    /**
    Called when the tooltip has been (re)positioned. The argument is
    the [space](https://codemirror.net/6/docs/ref/#view.tooltips^config.tooltipSpace) available to the
    tooltip.
    */
    positioned?(space: Rect): void;
    /**
    By default, the library will restrict the size of tooltips so
    that they don't stick out of the available space. Set this to
    false to disable that.
    */
    resize?: boolean;
}
/**
Facet to which an extension can add a value to show a tooltip.
*/
declare const showTooltip: Facet<Tooltip | null, readonly (Tooltip | null)[]>;
/**
Tell the tooltip extension to recompute the position of the active
tooltips. This can be useful when something happens (such as a
re-positioning or CSS change affecting the editor) that could
invalidate the existing tooltip positions.
*/
declare function repositionTooltips(view: EditorView): void;
/**
Object that describes an active panel.
*/
interface Panel {
    /**
    The element representing this panel. The library will add the
    `"cm-panel"` DOM class to this.
    */
    dom: HTMLElement;
    /**
    Optionally called after the panel has been added to the editor.
    */
    mount?(): void;
    /**
    Update the DOM for a given view update.
    */
    update?(update: ViewUpdate): void;
    /**
    Called when the panel is removed from the editor or the editor
    is destroyed.
    */
    destroy?(): void;
    /**
    Whether the panel should be at the top or bottom of the editor.
    Defaults to false.
    */
    top?: boolean;
}
/**
A function that initializes a panel. Used in
[`showPanel`](https://codemirror.net/6/docs/ref/#view.showPanel).
*/
declare type PanelConstructor = (view: EditorView) => Panel;
/**
Opening a panel is done by providing a constructor function for
the panel through this facet. (The panel is closed again when its
constructor is no longer provided.) Values of `null` are ignored.
*/
declare const showPanel: Facet<PanelConstructor | null, readonly (PanelConstructor | null)[]>;

/**
A gutter marker represents a bit of information attached to a line
in a specific gutter. Your own custom markers have to extend this
class.
*/
declare abstract class GutterMarker extends RangeValue {
    /**
    Compare this marker to another marker of the same type.
    */
    eq(other: GutterMarker): boolean;
    /**
    Render the DOM node for this marker, if any.
    */
    toDOM?(view: EditorView): Node;
    /**
    This property can be used to add CSS classes to the gutter
    element that contains this marker.
    */
    elementClass: string;
    /**
    Called if the marker has a `toDOM` method and its representation
    was removed from a gutter.
    */
    destroy(dom: Node): void;
}
declare type Handlers$1 = {
    [event: string]: (view: EditorView, line: BlockInfo, event: Event) => boolean;
};
interface GutterConfig {
    /**
    An extra CSS class to be added to the wrapper (`cm-gutter`)
    element.
    */
    class?: string;
    /**
    Controls whether empty gutter elements should be rendered.
    Defaults to false.
    */
    renderEmptyElements?: boolean;
    /**
    Retrieve a set of markers to use in this gutter.
    */
    markers?: (view: EditorView) => (RangeSet<GutterMarker> | readonly RangeSet<GutterMarker>[]);
    /**
    Can be used to optionally add a single marker to every line.
    */
    lineMarker?: (view: EditorView, line: BlockInfo, otherMarkers: readonly GutterMarker[]) => GutterMarker | null;
    /**
    If line markers depend on additional state, and should be
    updated when that changes, pass a predicate here that checks
    whether a given view update might change the line markers.
    */
    lineMarkerChange?: null | ((update: ViewUpdate) => boolean);
    /**
    Add a hidden spacer element that gives the gutter its base
    width.
    */
    initialSpacer?: null | ((view: EditorView) => GutterMarker);
    /**
    Update the spacer element when the view is updated.
    */
    updateSpacer?: null | ((spacer: GutterMarker, update: ViewUpdate) => GutterMarker);
    /**
    Supply event handlers for DOM events on this gutter.
    */
    domEventHandlers?: Handlers$1;
}
/**
Define an editor gutter. The order in which the gutters appear is
determined by their extension priority.
*/
declare function gutter(config: GutterConfig): Extension;
/**
The gutter-drawing plugin is automatically enabled when you add a
gutter, but you can use this function to explicitly configure it.

Unless `fixed` is explicitly set to `false`, the gutters are
fixed, meaning they don't scroll along with the content
horizontally (except on Internet Explorer, which doesn't support
CSS [`position:
sticky`](https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky)).
*/
declare function gutters(config?: {
    fixed?: boolean;
}): Extension;
interface LineNumberConfig {
    /**
    How to display line numbers. Defaults to simply converting them
    to string.
    */
    formatNumber?: (lineNo: number, state: EditorState) => string;
    /**
    Supply event handlers for DOM events on this gutter.
    */
    domEventHandlers?: Handlers$1;
}
/**
Facet used to provide markers to the line number gutter.
*/
declare const lineNumberMarkers: Facet<RangeSet<GutterMarker>, readonly RangeSet<GutterMarker>[]>;
/**
Create a line number gutter extension.
*/
declare function lineNumbers(config?: LineNumberConfig): Extension;

declare class Tag {
    readonly set: Tag[];
    static define(parent?: Tag): Tag;
    static defineModifier(): (tag: Tag) => Tag;
}
interface Highlighter {
    style(tags: readonly Tag[]): string | null;
    scope?(node: NodeType): boolean;
}
declare function highlightTree(tree: Tree, highlighter: Highlighter | readonly Highlighter[], putStyle: (from: number, to: number, classes: string) => void, from?: number, to?: number): void;
declare const tags: {
    comment: Tag;
    lineComment: Tag;
    blockComment: Tag;
    docComment: Tag;
    name: Tag;
    variableName: Tag;
    typeName: Tag;
    tagName: Tag;
    propertyName: Tag;
    attributeName: Tag;
    className: Tag;
    labelName: Tag;
    namespace: Tag;
    macroName: Tag;
    literal: Tag;
    string: Tag;
    docString: Tag;
    character: Tag;
    attributeValue: Tag;
    number: Tag;
    integer: Tag;
    float: Tag;
    bool: Tag;
    regexp: Tag;
    escape: Tag;
    color: Tag;
    url: Tag;
    keyword: Tag;
    self: Tag;
    null: Tag;
    atom: Tag;
    unit: Tag;
    modifier: Tag;
    operatorKeyword: Tag;
    controlKeyword: Tag;
    definitionKeyword: Tag;
    moduleKeyword: Tag;
    operator: Tag;
    derefOperator: Tag;
    arithmeticOperator: Tag;
    logicOperator: Tag;
    bitwiseOperator: Tag;
    compareOperator: Tag;
    updateOperator: Tag;
    definitionOperator: Tag;
    typeOperator: Tag;
    controlOperator: Tag;
    punctuation: Tag;
    separator: Tag;
    bracket: Tag;
    angleBracket: Tag;
    squareBracket: Tag;
    paren: Tag;
    brace: Tag;
    content: Tag;
    heading: Tag;
    heading1: Tag;
    heading2: Tag;
    heading3: Tag;
    heading4: Tag;
    heading5: Tag;
    heading6: Tag;
    contentSeparator: Tag;
    list: Tag;
    quote: Tag;
    emphasis: Tag;
    strong: Tag;
    link: Tag;
    monospace: Tag;
    strikethrough: Tag;
    inserted: Tag;
    deleted: Tag;
    changed: Tag;
    invalid: Tag;
    meta: Tag;
    documentMeta: Tag;
    annotation: Tag;
    processingInstruction: Tag;
    definition: (tag: Tag) => Tag;
    constant: (tag: Tag) => Tag;
    function: (tag: Tag) => Tag;
    standard: (tag: Tag) => Tag;
    local: (tag: Tag) => Tag;
    special: (tag: Tag) => Tag;
};

/**
A language object manages parsing and per-language
[metadata](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt). Parse data is
managed as a [Lezer](https://lezer.codemirror.net) tree. The class
can be used directly, via the [`LRLanguage`](https://codemirror.net/6/docs/ref/#language.LRLanguage)
subclass for [Lezer](https://lezer.codemirror.net/) LR parsers, or
via the [`StreamLanguage`](https://codemirror.net/6/docs/ref/#language.StreamLanguage) subclass
for stream parsers.
*/
declare class Language {
    /**
    The [language data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt) facet
    used for this language.
    */
    readonly data: Facet<{
        [name: string]: any;
    }>;
    /**
    A language name.
    */
    readonly name: string;
    /**
    The extension value to install this as the document language.
    */
    readonly extension: Extension;
    /**
    The parser object. Can be useful when using this as a [nested
    parser](https://lezer.codemirror.net/docs/ref#common.Parser).
    */
    parser: Parser;
    /**
    Construct a language object. If you need to invoke this
    directly, first define a data facet with
    [`defineLanguageFacet`](https://codemirror.net/6/docs/ref/#language.defineLanguageFacet), and then
    configure your parser to [attach](https://codemirror.net/6/docs/ref/#language.languageDataProp) it
    to the language's outer syntax node.
    */
    constructor(
    /**
    The [language data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt) facet
    used for this language.
    */
    data: Facet<{
        [name: string]: any;
    }>, parser: Parser, extraExtensions?: Extension[],
    /**
    A language name.
    */
    name?: string);
    /**
    Query whether this language is active at the given position.
    */
    isActiveAt(state: EditorState, pos: number, side?: -1 | 0 | 1): boolean;
    /**
    Find the document regions that were parsed using this language.
    The returned regions will _include_ any nested languages rooted
    in this language, when those exist.
    */
    findRegions(state: EditorState): {
        from: number;
        to: number;
    }[];
    /**
    Indicates whether this language allows nested languages. The
    default implementation returns true.
    */
    get allowsNesting(): boolean;
}
/**
A subclass of [`Language`](https://codemirror.net/6/docs/ref/#language.Language) for use with Lezer
[LR parsers](https://lezer.codemirror.net/docs/ref#lr.LRParser)
parsers.
*/
declare class LRLanguage extends Language {
    readonly parser: LRParser;
    private constructor();
    /**
    Define a language from a parser.
    */
    static define(spec: {
        /**
        The [name](https://codemirror.net/6/docs/ref/#Language.name) of the language.
        */
        name?: string;
        /**
        The parser to use. Should already have added editor-relevant
        node props (and optionally things like dialect and top rule)
        configured.
        */
        parser: LRParser;
        /**
        [Language data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt)
        to register for this language.
        */
        languageData?: {
            [name: string]: any;
        };
    }): LRLanguage;
    /**
    Create a new instance of this language with a reconfigured
    version of its parser and optionally a new name.
    */
    configure(options: ParserConfig, name?: string): LRLanguage;
    get allowsNesting(): boolean;
}
/**
Get the syntax tree for a state, which is the current (possibly
incomplete) parse tree of the active
[language](https://codemirror.net/6/docs/ref/#language.Language), or the empty tree if there is no
language available.
*/
declare function syntaxTree(state: EditorState): Tree;
/**
Try to get a parse tree that spans at least up to `upto`. The
method will do at most `timeout` milliseconds of work to parse
up to that point if the tree isn't already available.
*/
declare function ensureSyntaxTree(state: EditorState, upto: number, timeout?: number): Tree | null;
/**
This class bundles a [language](https://codemirror.net/6/docs/ref/#language.Language) with an
optional set of supporting extensions. Language packages are
encouraged to export a function that optionally takes a
configuration object and returns a `LanguageSupport` instance, as
the main way for client code to use the package.
*/
declare class LanguageSupport {
    /**
    The language object.
    */
    readonly language: Language;
    /**
    An optional set of supporting extensions. When nesting a
    language in another language, the outer language is encouraged
    to include the supporting extensions for its inner languages
    in its own set of support extensions.
    */
    readonly support: Extension;
    /**
    An extension including both the language and its support
    extensions. (Allowing the object to be used as an extension
    value itself.)
    */
    extension: Extension;
    /**
    Create a language support object.
    */
    constructor(
    /**
    The language object.
    */
    language: Language,
    /**
    An optional set of supporting extensions. When nesting a
    language in another language, the outer language is encouraged
    to include the supporting extensions for its inner languages
    in its own set of support extensions.
    */
    support?: Extension);
}
/**
Language descriptions are used to store metadata about languages
and to dynamically load them. Their main role is finding the
appropriate language for a filename or dynamically loading nested
parsers.
*/
declare class LanguageDescription {
    /**
    The name of this language.
    */
    readonly name: string;
    /**
    Alternative names for the mode (lowercased, includes `this.name`).
    */
    readonly alias: readonly string[];
    /**
    File extensions associated with this language.
    */
    readonly extensions: readonly string[];
    /**
    Optional filename pattern that should be associated with this
    language.
    */
    readonly filename: RegExp | undefined;
    private loadFunc;
    /**
    If the language has been loaded, this will hold its value.
    */
    support: LanguageSupport | undefined;
    private loading;
    private constructor();
    /**
    Start loading the the language. Will return a promise that
    resolves to a [`LanguageSupport`](https://codemirror.net/6/docs/ref/#language.LanguageSupport)
    object when the language successfully loads.
    */
    load(): Promise<LanguageSupport>;
    /**
    Create a language description.
    */
    static of(spec: {
        /**
        The language's name.
        */
        name: string;
        /**
        An optional array of alternative names.
        */
        alias?: readonly string[];
        /**
        An optional array of filename extensions associated with this
        language.
        */
        extensions?: readonly string[];
        /**
        An optional filename pattern associated with this language.
        */
        filename?: RegExp;
        /**
        A function that will asynchronously load the language.
        */
        load?: () => Promise<LanguageSupport>;
        /**
        Alternatively to `load`, you can provide an already loaded
        support object. Either this or `load` should be provided.
        */
        support?: LanguageSupport;
    }): LanguageDescription;
    /**
    Look for a language in the given array of descriptions that
    matches the filename. Will first match
    [`filename`](https://codemirror.net/6/docs/ref/#language.LanguageDescription.filename) patterns,
    and then [extensions](https://codemirror.net/6/docs/ref/#language.LanguageDescription.extensions),
    and return the first language that matches.
    */
    static matchFilename(descs: readonly LanguageDescription[], filename: string): LanguageDescription | null;
    /**
    Look for a language whose name or alias matches the the given
    name (case-insensitively). If `fuzzy` is true, and no direct
    matchs is found, this'll also search for a language whose name
    or alias occurs in the string (for names shorter than three
    characters, only when surrounded by non-word characters).
    */
    static matchLanguageName(descs: readonly LanguageDescription[], name: string, fuzzy?: boolean): LanguageDescription | null;
}
/**
Facet for overriding the unit by which indentation happens. Should
be a string consisting either entirely of the same whitespace
character. When not set, this defaults to 2 spaces.
*/
declare const indentUnit: Facet<string, string>;
/**
Indentation contexts are used when calling [indentation
services](https://codemirror.net/6/docs/ref/#language.indentService). They provide helper utilities
useful in indentation logic, and can selectively override the
indentation reported for some lines.
*/
declare class IndentContext {
    /**
    The editor state.
    */
    readonly state: EditorState;
    /**
    The indent unit (number of columns per indentation level).
    */
    unit: number;
    /**
    Create an indent context.
    */
    constructor(
    /**
    The editor state.
    */
    state: EditorState,
    /**
    @internal
    */
    options?: {
        /**
        Override line indentations provided to the indentation
        helper function, which is useful when implementing region
        indentation, where indentation for later lines needs to refer
        to previous lines, which may have been reindented compared to
        the original start state. If given, this function should
        return -1 for lines (given by start position) that didn't
        change, and an updated indentation otherwise.
        */
        overrideIndentation?: (pos: number) => number;
        /**
        Make it look, to the indent logic, like a line break was
        added at the given position (which is mostly just useful for
        implementing something like
        [`insertNewlineAndIndent`](https://codemirror.net/6/docs/ref/#commands.insertNewlineAndIndent)).
        */
        simulateBreak?: number;
        /**
        When `simulateBreak` is given, this can be used to make the
        simulated break behave like a double line break.
        */
        simulateDoubleBreak?: boolean;
    });
    /**
    Get a description of the line at the given position, taking
    [simulated line
    breaks](https://codemirror.net/6/docs/ref/#language.IndentContext.constructor^options.simulateBreak)
    into account. If there is such a break at `pos`, the `bias`
    argument determines whether the part of the line line before or
    after the break is used.
    */
    lineAt(pos: number, bias?: -1 | 1): {
        text: string;
        from: number;
    };
    /**
    Get the text directly after `pos`, either the entire line
    or the next 100 characters, whichever is shorter.
    */
    textAfterPos(pos: number, bias?: -1 | 1): string;
    /**
    Find the column for the given position.
    */
    column(pos: number, bias?: -1 | 1): number;
    /**
    Find the column position (taking tabs into account) of the given
    position in the given string.
    */
    countColumn(line: string, pos?: number): number;
    /**
    Find the indentation column of the line at the given point.
    */
    lineIndent(pos: number, bias?: -1 | 1): number;
    /**
    Returns the [simulated line
    break](https://codemirror.net/6/docs/ref/#language.IndentContext.constructor^options.simulateBreak)
    for this context, if any.
    */
    get simulatedBreak(): number | null;
}
/**
Enables reindentation on input. When a language defines an
`indentOnInput` field in its [language
data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt), which must hold a regular
expression, the line at the cursor will be reindented whenever new
text is typed and the input from the start of the line up to the
cursor matches that regexp.

To avoid unneccesary reindents, it is recommended to start the
regexp with `^` (usually followed by `\s*`), and end it with `$`.
For example, `/^\s*\}$/` will reindent when a closing brace is
added at the start of a line.
*/
declare function indentOnInput(): Extension;
/**
Default fold-related key bindings.

 - Ctrl-Shift-[ (Cmd-Alt-[ on macOS): [`foldCode`](https://codemirror.net/6/docs/ref/#language.foldCode).
 - Ctrl-Shift-] (Cmd-Alt-] on macOS): [`unfoldCode`](https://codemirror.net/6/docs/ref/#language.unfoldCode).
 - Ctrl-Alt-[: [`foldAll`](https://codemirror.net/6/docs/ref/#language.foldAll).
 - Ctrl-Alt-]: [`unfoldAll`](https://codemirror.net/6/docs/ref/#language.unfoldAll).
*/
declare const foldKeymap: readonly KeyBinding[];
interface FoldConfig {
    /**
    A function that creates the DOM element used to indicate the
    position of folded code. The `onclick` argument is the default
    click event handler, which toggles folding on the line that
    holds the element, and should probably be added as an event
    handler to the returned element.

    When this option isn't given, the `placeholderText` option will
    be used to create the placeholder element.
    */
    placeholderDOM?: ((view: EditorView, onclick: (event: Event) => void) => HTMLElement) | null;
    /**
    Text to use as placeholder for folded text. Defaults to `"…"`.
    Will be styled with the `"cm-foldPlaceholder"` class.
    */
    placeholderText?: string;
}
/**
Create an extension that configures code folding.
*/
declare function codeFolding(config?: FoldConfig): Extension;
declare type Handlers = {
    [event: string]: (view: EditorView, line: BlockInfo, event: Event) => boolean;
};
interface FoldGutterConfig {
    /**
    A function that creates the DOM element used to indicate a
    given line is folded or can be folded.
    When not given, the `openText`/`closeText` option will be used instead.
    */
    markerDOM?: ((open: boolean) => HTMLElement) | null;
    /**
    Text used to indicate that a given line can be folded.
    Defaults to `"⌄"`.
    */
    openText?: string;
    /**
    Text used to indicate that a given line is folded.
    Defaults to `"›"`.
    */
    closedText?: string;
    /**
    Supply event handlers for DOM events on this gutter.
    */
    domEventHandlers?: Handlers;
    /**
    When given, if this returns true for a given view update,
    recompute the fold markers.
    */
    foldingChanged?: (update: ViewUpdate) => boolean;
}
/**
Create an extension that registers a fold gutter, which shows a
fold status indicator before foldable lines (which can be clicked
to fold or unfold the line).
*/
declare function foldGutter(config?: FoldGutterConfig): Extension;

/**
A highlight style associates CSS styles with higlighting
[tags](https://lezer.codemirror.net/docs/ref#highlight.Tag).
*/
declare class HighlightStyle implements Highlighter {
    /**
    The tag styles used to create this highlight style.
    */
    readonly specs: readonly TagStyle[];
    /**
    A style module holding the CSS rules for this highlight style.
    When using
    [`highlightTree`](https://lezer.codemirror.net/docs/ref#highlight.highlightTree)
    outside of the editor, you may want to manually mount this
    module to show the highlighting.
    */
    readonly module: StyleModule | null;
    readonly style: (tags: readonly Tag[]) => string | null;
    readonly scope: ((type: NodeType) => boolean) | undefined;
    private constructor();
    /**
    Create a highlighter style that associates the given styles to
    the given tags. The specs must be objects that hold a style tag
    or array of tags in their `tag` property, and either a single
    `class` property providing a static CSS class (for highlighter
    that rely on external styling), or a
    [`style-mod`](https://github.com/marijnh/style-mod#documentation)-style
    set of CSS properties (which define the styling for those tags).

    The CSS rules created for a highlighter will be emitted in the
    order of the spec's properties. That means that for elements that
    have multiple tags associated with them, styles defined further
    down in the list will have a higher CSS precedence than styles
    defined earlier.
    */
    static define(specs: readonly TagStyle[], options?: {
        /**
        By default, highlighters apply to the entire document. You can
        scope them to a single language by providing the language
        object or a language's top node type here.
        */
        scope?: Language | NodeType;
        /**
        Add a style to _all_ content. Probably only useful in
        combination with `scope`.
        */
        all?: string | StyleSpec;
        /**
        Specify that this highlight style should only be active then
        the theme is dark or light. By default, it is active
        regardless of theme.
        */
        themeType?: "dark" | "light";
    }): HighlightStyle;
}
/**
Wrap a highlighter in an editor extension that uses it to apply
syntax highlighting to the editor content.

When multiple (non-fallback) styles are provided, the styling
applied is the union of the classes they emit.
*/
declare function syntaxHighlighting(highlighter: Highlighter, options?: {
    /**
    When enabled, this marks the highlighter as a fallback, which
    only takes effect if no other highlighters are registered.
    */
    fallback: boolean;
}): Extension;
/**
The type of object used in
[`HighlightStyle.define`](https://codemirror.net/6/docs/ref/#language.HighlightStyle^define).
Assigns a style to one or more highlighting
[tags](https://lezer.codemirror.net/docs/ref#highlight.Tag), which can either be a fixed class name
(which must be defined elsewhere), or a set of CSS properties, for
which the library will define an anonymous class.
*/
interface TagStyle {
    /**
    The tag or tags to target.
    */
    tag: Tag | readonly Tag[];
    /**
    If given, this maps the tags to a fixed class name.
    */
    class?: string;
    /**
    Any further properties (if `class` isn't given) will be
    interpreted as in style objects given to
    [style-mod](https://github.com/marijnh/style-mod#documentation).
    (The type here is `any` because of TypeScript limitations.)
    */
    [styleProperty: string]: any;
}

interface Config {
    /**
    Whether the bracket matching should look at the character after
    the cursor when matching (if the one before isn't a bracket).
    Defaults to true.
    */
    afterCursor?: boolean;
    /**
    The bracket characters to match, as a string of pairs. Defaults
    to `"()[]{}"`. Note that these are only used as fallback when
    there is no [matching
    information](https://lezer.codemirror.net/docs/ref/#common.NodeProp^closedBy)
    in the syntax tree.
    */
    brackets?: string;
    /**
    The maximum distance to scan for matching brackets. This is only
    relevant for brackets not encoded in the syntax tree. Defaults
    to 10 000.
    */
    maxScanDistance?: number;
    /**
    Can be used to configure the way in which brackets are
    decorated. The default behavior is to add the
    `cm-matchingBracket` class for matching pairs, and
    `cm-nonmatchingBracket` for mismatched pairs or single brackets.
    */
    renderMatch?: (match: MatchResult, state: EditorState) => readonly Range<Decoration>[];
}
/**
Create an extension that enables bracket matching. Whenever the
cursor is next to a bracket, that bracket and the one it matches
are highlighted. Or, when no matching bracket is found, another
highlighting style is used to indicate this.
*/
declare function bracketMatching(config?: Config): Extension;
/**
The result returned from `matchBrackets`.
*/
interface MatchResult {
    /**
    The extent of the bracket token found.
    */
    start: {
        from: number;
        to: number;
    };
    /**
    The extent of the matched token, if any was found.
    */
    end?: {
        from: number;
        to: number;
    };
    /**
    Whether the tokens match. This can be false even when `end` has
    a value, if that token doesn't match the opening token.
    */
    matched: boolean;
}

/**
Encapsulates a single line of input. Given to stream syntax code,
which uses it to tokenize the content.
*/
declare class StringStream {
    /**
    The line.
    */
    string: string;
    private tabSize;
    /**
    The current indent unit size.
    */
    indentUnit: number;
    private overrideIndent?;
    /**
    The current position on the line.
    */
    pos: number;
    /**
    The start position of the current token.
    */
    start: number;
    private lastColumnPos;
    private lastColumnValue;
    /**
    Create a stream.
    */
    constructor(
    /**
    The line.
    */
    string: string, tabSize: number,
    /**
    The current indent unit size.
    */
    indentUnit: number, overrideIndent?: number | undefined);
    /**
    True if we are at the end of the line.
    */
    eol(): boolean;
    /**
    True if we are at the start of the line.
    */
    sol(): boolean;
    /**
    Get the next code unit after the current position, or undefined
    if we're at the end of the line.
    */
    peek(): string | undefined;
    /**
    Read the next code unit and advance `this.pos`.
    */
    next(): string | void;
    /**
    Match the next character against the given string, regular
    expression, or predicate. Consume and return it if it matches.
    */
    eat(match: string | RegExp | ((ch: string) => boolean)): string | void;
    /**
    Continue matching characters that match the given string,
    regular expression, or predicate function. Return true if any
    characters were consumed.
    */
    eatWhile(match: string | RegExp | ((ch: string) => boolean)): boolean;
    /**
    Consume whitespace ahead of `this.pos`. Return true if any was
    found.
    */
    eatSpace(): boolean;
    /**
    Move to the end of the line.
    */
    skipToEnd(): void;
    /**
    Move to directly before the given character, if found on the
    current line.
    */
    skipTo(ch: string): boolean | void;
    /**
    Move back `n` characters.
    */
    backUp(n: number): void;
    /**
    Get the column position at `this.pos`.
    */
    column(): number;
    /**
    Get the indentation column of the current line.
    */
    indentation(): number;
    /**
    Match the input against the given string or regular expression
    (which should start with a `^`). Return true or the regexp match
    if it matches.

    Unless `consume` is set to `false`, this will move `this.pos`
    past the matched text.

    When matching a string `caseInsensitive` can be set to true to
    make the match case-insensitive.
    */
    match(pattern: string | RegExp, consume?: boolean, caseInsensitive?: boolean): boolean | RegExpMatchArray | null;
    /**
    Get the current token.
    */
    current(): string;
}

/**
A stream parser parses or tokenizes content from start to end,
emitting tokens as it goes over it. It keeps a mutable (but
copyable) object with state, in which it can store information
about the current context.
*/
interface StreamParser<State> {
    /**
    A name for this language.
    */
    name?: string;
    /**
    Produce a start state for the parser.
    */
    startState?(indentUnit: number): State;
    /**
    Read one token, advancing the stream past it, and returning a
    string indicating the token's style tag—either the name of one
    of the tags in
    [`tags`](https://lezer.codemirror.net/docs/ref#highlight.tags),
    or such a name suffixed by one or more tag
    [modifier](https://lezer.codemirror.net/docs/ref#highlight.Tag^defineModifier)
    names, separated by periods. For example `"keyword"` or
    "`variableName.constant"`.

    It is okay to return a zero-length token, but only if that
    updates the state so that the next call will return a non-empty
    token again.
    */
    token(stream: StringStream, state: State): string | null;
    /**
    This notifies the parser of a blank line in the input. It can
    update its state here if it needs to.
    */
    blankLine?(state: State, indentUnit: number): void;
    /**
    Copy a given state. By default, a shallow object copy is done
    which also copies arrays held at the top level of the object.
    */
    copyState?(state: State): State;
    /**
    Compute automatic indentation for the line that starts with the
    given state and text.
    */
    indent?(state: State, textAfter: string, context: IndentContext): number | null;
    /**
    Default [language data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt) to
    attach to this language.
    */
    languageData?: {
        [name: string]: any;
    };
    /**
    Extra tokens to use in this parser. When the tokenizer returns a
    token name that exists as a property in this object, the
    corresponding tag will be assigned to the token.
    */
    tokenTable?: {
        [name: string]: Tag;
    };
}
/**
A [language](https://codemirror.net/6/docs/ref/#language.Language) class based on a CodeMirror
5-style [streaming parser](https://codemirror.net/6/docs/ref/#language.StreamParser).
*/
declare class StreamLanguage<State> extends Language {
    private constructor();
    /**
    Define a stream language.
    */
    static define<State>(spec: StreamParser<State>): StreamLanguage<State>;
    private getIndent;
    get allowsNesting(): boolean;
}

interface CompletionConfig {
    /**
    When enabled (defaults to true), autocompletion will start
    whenever the user types something that can be completed.
    */
    activateOnTyping?: boolean;
    /**
    By default, when completion opens, the first option is selected
    and can be confirmed with
    [`acceptCompletion`](https://codemirror.net/6/docs/ref/#autocomplete.acceptCompletion). When this
    is set to false, the completion widget starts with no completion
    selected, and the user has to explicitly move to a completion
    before you can confirm one.
    */
    selectOnOpen?: boolean;
    /**
    Override the completion sources used. By default, they will be
    taken from the `"autocomplete"` [language
    data](https://codemirror.net/6/docs/ref/#state.EditorState.languageDataAt) (which should hold
    [completion sources](https://codemirror.net/6/docs/ref/#autocomplete.CompletionSource) or arrays
    of [completions](https://codemirror.net/6/docs/ref/#autocomplete.Completion)).
    */
    override?: readonly CompletionSource[] | null;
    /**
    Determines whether the completion tooltip is closed when the
    editor loses focus. Defaults to true.
    */
    closeOnBlur?: boolean;
    /**
    The maximum number of options to render to the DOM.
    */
    maxRenderedOptions?: number;
    /**
    Set this to false to disable the [default completion
    keymap](https://codemirror.net/6/docs/ref/#autocomplete.completionKeymap). (This requires you to
    add bindings to control completion yourself. The bindings should
    probably have a higher precedence than other bindings for the
    same keys.)
    */
    defaultKeymap?: boolean;
    /**
    By default, completions are shown below the cursor when there is
    space. Setting this to true will make the extension put the
    completions above the cursor when possible.
    */
    aboveCursor?: boolean;
    /**
    When given, this may return an additional CSS class to add to
    the completion dialog element.
    */
    tooltipClass?: (state: EditorState) => string;
    /**
    This can be used to add additional CSS classes to completion
    options.
    */
    optionClass?: (completion: Completion) => string;
    /**
    By default, the library will render icons based on the
    completion's [type](https://codemirror.net/6/docs/ref/#autocomplete.Completion.type) in front of
    each option. Set this to false to turn that off.
    */
    icons?: boolean;
    /**
    This option can be used to inject additional content into
    options. The `render` function will be called for each visible
    completion, and should produce a DOM node to show. `position`
    determines where in the DOM the result appears, relative to
    other added widgets and the standard content. The default icons
    have position 20, the label position 50, and the detail position
    80.
    */
    addToOptions?: {
        render: (completion: Completion, state: EditorState) => Node | null;
        position: number;
    }[];
    /**
    The comparison function to use when sorting completions with the same
    match score. Defaults to using
    [`localeCompare`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare).
    */
    compareCompletions?: (a: Completion, b: Completion) => number;
    /**
    By default, commands relating to an open completion only take
    effect 75 milliseconds after the completion opened, so that key
    presses made before the user is aware of the tooltip don't go to
    the tooltip. This option can be used to configure that delay.
    */
    interactionDelay?: number;
}

/**
Objects type used to represent individual completions.
*/
interface Completion {
    /**
    The label to show in the completion picker. This is what input
    is matched agains to determine whether a completion matches (and
    how well it matches).
    */
    label: string;
    /**
    An optional short piece of information to show (with a different
    style) after the label.
    */
    detail?: string;
    /**
    Additional info to show when the completion is selected. Can be
    a plain string or a function that'll render the DOM structure to
    show when invoked.
    */
    info?: string | ((completion: Completion) => (Node | null | Promise<Node | null>));
    /**
    How to apply the completion. The default is to replace it with
    its [label](https://codemirror.net/6/docs/ref/#autocomplete.Completion.label). When this holds a
    string, the completion range is replaced by that string. When it
    is a function, that function is called to perform the
    completion. If it fires a transaction, it is responsible for
    adding the [`pickedCompletion`](https://codemirror.net/6/docs/ref/#autocomplete.pickedCompletion)
    annotation to it.
    */
    apply?: string | ((view: EditorView, completion: Completion, from: number, to: number) => void);
    /**
    The type of the completion. This is used to pick an icon to show
    for the completion. Icons are styled with a CSS class created by
    appending the type name to `"cm-completionIcon-"`. You can
    define or restyle icons by defining these selectors. The base
    library defines simple icons for `class`, `constant`, `enum`,
    `function`, `interface`, `keyword`, `method`, `namespace`,
    `property`, `text`, `type`, and `variable`.

    Multiple types can be provided by separating them with spaces.
    */
    type?: string;
    /**
    When given, should be a number from -99 to 99 that adjusts how
    this completion is ranked compared to other completions that
    match the input as well as this one. A negative number moves it
    down the list, a positive number moves it up.
    */
    boost?: number;
}
/**
An instance of this is passed to completion source functions.
*/
declare class CompletionContext {
    /**
    The editor state that the completion happens in.
    */
    readonly state: EditorState;
    /**
    The position at which the completion is happening.
    */
    readonly pos: number;
    /**
    Indicates whether completion was activated explicitly, or
    implicitly by typing. The usual way to respond to this is to
    only return completions when either there is part of a
    completable entity before the cursor, or `explicit` is true.
    */
    readonly explicit: boolean;
    /**
    Create a new completion context. (Mostly useful for testing
    completion sources—in the editor, the extension will create
    these for you.)
    */
    constructor(
    /**
    The editor state that the completion happens in.
    */
    state: EditorState,
    /**
    The position at which the completion is happening.
    */
    pos: number,
    /**
    Indicates whether completion was activated explicitly, or
    implicitly by typing. The usual way to respond to this is to
    only return completions when either there is part of a
    completable entity before the cursor, or `explicit` is true.
    */
    explicit: boolean);
    /**
    Get the extent, content, and (if there is a token) type of the
    token before `this.pos`.
    */
    tokenBefore(types: readonly string[]): {
        from: number;
        to: number;
        text: string;
        type: NodeType;
    } | null;
    /**
    Get the match of the given expression directly before the
    cursor.
    */
    matchBefore(expr: RegExp): {
        from: number;
        to: number;
        text: string;
    } | null;
    /**
    Yields true when the query has been aborted. Can be useful in
    asynchronous queries to avoid doing work that will be ignored.
    */
    get aborted(): boolean;
    /**
    Allows you to register abort handlers, which will be called when
    the query is
    [aborted](https://codemirror.net/6/docs/ref/#autocomplete.CompletionContext.aborted).
    */
    addEventListener(type: "abort", listener: () => void): void;
}
/**
Wrap the given completion source so that it will not fire when the
cursor is in a syntax node with one of the given names.
*/
declare function ifNotIn(nodes: readonly string[], source: CompletionSource): CompletionSource;
/**
The function signature for a completion source. Such a function
may return its [result](https://codemirror.net/6/docs/ref/#autocomplete.CompletionResult)
synchronously or as a promise. Returning null indicates no
completions are available.
*/
declare type CompletionSource = (context: CompletionContext) => CompletionResult | null | Promise<CompletionResult | null>;
/**
Interface for objects returned by completion sources.
*/
interface CompletionResult {
    /**
    The start of the range that is being completed.
    */
    from: number;
    /**
    The end of the range that is being completed. Defaults to the
    main cursor position.
    */
    to?: number;
    /**
    The completions returned. These don't have to be compared with
    the input by the source—the autocompletion system will do its
    own matching (against the text between `from` and `to`) and
    sorting.
    */
    options: readonly Completion[];
    /**
    When given, further typing or deletion that causes the part of
    the document between ([mapped](https://codemirror.net/6/docs/ref/#state.ChangeDesc.mapPos)) `from`
    and `to` to match this regular expression or predicate function
    will not query the completion source again, but continue with
    this list of options. This can help a lot with responsiveness,
    since it allows the completion list to be updated synchronously.
    */
    validFor?: RegExp | ((text: string, from: number, to: number, state: EditorState) => boolean);
    /**
    By default, the library filters and scores completions. Set
    `filter` to `false` to disable this, and cause your completions
    to all be included, in the order they were given. When there are
    other sources, unfiltered completions appear at the top of the
    list of completions. `validFor` must not be given when `filter`
    is `false`, because it only works when filtering.
    */
    filter?: boolean;
    /**
    When [`filter`](https://codemirror.net/6/docs/ref/#autocomplete.CompletionResult.filter) is set to
    `false`, this may be provided to compute the ranges on the label
    that match the input. Should return an array of numbers where
    each pair of adjacent numbers provide the start and end of a
    range.
    */
    getMatch?: (completion: Completion) => readonly number[];
    /**
    Synchronously update the completion result after typing or
    deletion. If given, this should not do any expensive work, since
    it will be called during editor state updates. The function
    should make sure (similar to
    [`validFor`](https://codemirror.net/6/docs/ref/#autocomplete.CompletionResult.validFor)) that the
    completion still applies in the new state.
    */
    update?: (current: CompletionResult, from: number, to: number, context: CompletionContext) => CompletionResult | null;
}

/**
Returns a command that moves the completion selection forward or
backward by the given amount.
*/
declare function moveCompletionSelection(forward: boolean, by?: "option" | "page"): Command;
/**
Accept the current completion.
*/
declare const acceptCompletion: Command;
/**
Explicitly start autocompletion.
*/
declare const startCompletion: Command;
/**
Close the currently active completion.
*/
declare const closeCompletion: Command;

/**
A completion source that will scan the document for words (using a
[character categorizer](https://codemirror.net/6/docs/ref/#state.EditorState.charCategorizer)), and
return those as completions.
*/
declare const completeAnyWord: CompletionSource;
/**
Extension to enable bracket-closing behavior. When a closeable
bracket is typed, its closing bracket is immediately inserted
after the cursor. When closing a bracket directly in front of a
closing bracket inserted by the extension, the cursor moves over
that bracket.
*/
declare function closeBrackets(): Extension;
/**
Close-brackets related key bindings. Binds Backspace to
[`deleteBracketPair`](https://codemirror.net/6/docs/ref/#autocomplete.deleteBracketPair).
*/
declare const closeBracketsKeymap: readonly KeyBinding[];

/**
Returns an extension that enables autocompletion.
*/
declare function autocompletion(config?: CompletionConfig): Extension;
/**
Get the current completion status. When completions are available,
this will return `"active"`. When completions are pending (in the
process of being queried), this returns `"pending"`. Otherwise, it
returns `null`.
*/
declare function completionStatus(state: EditorState): null | "active" | "pending";
/**
Returns the available completions as an array.
*/
declare function currentCompletions(state: EditorState): readonly Completion[];
/**
Return the currently selected completion, if any.
*/
declare function selectedCompletion(state: EditorState): Completion | null;
/**
Returns the currently selected position in the active completion
list, or null if no completions are active.
*/
declare function selectedCompletionIndex(state: EditorState): number | null;

/**
Describes an element in your XML document schema.
*/
interface ElementSpec {
    /**
    The element name.
    */
    name: string;
    /**
    Allowed children in this element. When not given, all elements
    are allowed inside it.
    */
    children?: readonly string[];
    /**
    When given, allows users to complete the given content strings
    as plain text when at the start of the element.
    */
    textContent?: readonly string[];
    /**
    Whether this element may appear at the top of the document.
    */
    top?: boolean;
    /**
    Allowed attributes in this element. Strings refer to attributes
    specified in [`XMLConfig.attrs`](https://codemirror.net/6/docs/ref/#lang-xml.XMLConfig.attrs), but
    you can also provide one-off [attribute
    specs](https://codemirror.net/6/docs/ref/#lang-xml.AttrSpec). Attributes marked as
    [`global`](https://codemirror.net/6/docs/ref/#lang-xml.AttrSpec.global) are allowed in every
    element, and don't have to be mentioned here.
    */
    attributes?: readonly (string | AttrSpec)[];
    /**
    Can be provided to add extra fields to the
    [completion](https://codemirror.net/6/docs/ref/#autocompletion.Completion) object created for this
    element.
    */
    completion?: Partial<Completion>;
}
/**
Describes an attribute in your XML schema.
*/
interface AttrSpec {
    /**
    The attribute name.
    */
    name: string;
    /**
    Pre-defined values to complete for this attribute.
    */
    values?: readonly (string | Completion)[];
    /**
    When `true`, this attribute can be added to all elements.
    */
    global?: boolean;
    /**
    Provides extra fields to the
    [completion](https://codemirror.net/6/docs/ref/#autocompletion.Completion) object created for this
    element
    */
    completion?: Partial<Completion>;
}
/**
Create a completion source for the given schema.
*/
declare function completeFromSchema(eltSpecs: readonly ElementSpec[], attrSpecs: readonly AttrSpec[]): CompletionSource;

/**
A language provider based on the [Lezer XML
parser](https://github.com/lezer-parser/xml), extended with
highlighting and indentation information.
*/
declare const xmlLanguage: LRLanguage;
declare type XMLConfig = {
    /**
    Provide a schema to create completions from.
    */
    elements?: readonly ElementSpec[];
    /**
    Supporting attribute descriptions for the schema specified in
    [`elements`](https://codemirror.net/6/docs/ref/#lang-xml.xml^conf.elements).
    */
    attributes?: readonly AttrSpec[];
};
/**
XML language support. Includes schema-based autocompletion when
configured.
*/
declare function xml$1(conf?: XMLConfig): LanguageSupport;

type _codemirror_lang_xml_AttrSpec = AttrSpec;
type _codemirror_lang_xml_ElementSpec = ElementSpec;
declare const _codemirror_lang_xml_completeFromSchema: typeof completeFromSchema;
declare const _codemirror_lang_xml_xmlLanguage: typeof xmlLanguage;
declare namespace _codemirror_lang_xml {
  export {
    _codemirror_lang_xml_AttrSpec as AttrSpec,
    _codemirror_lang_xml_ElementSpec as ElementSpec,
    _codemirror_lang_xml_completeFromSchema as completeFromSchema,
    xml$1 as xml,
    _codemirror_lang_xml_xmlLanguage as xmlLanguage,
  };
}

declare const wastLanguage: LRLanguage;
declare function wast$1(): LanguageSupport;

declare const _codemirror_lang_wast_wastLanguage: typeof wastLanguage;
declare namespace _codemirror_lang_wast {
  export {
    wast$1 as wast,
    _codemirror_lang_wast_wastLanguage as wastLanguage,
  };
}

/**
A language provider for Vue templates.
*/
declare const vueLanguage: LRLanguage;
/**
Vue template support.
*/
declare function vue$1(): LanguageSupport;

declare const _codemirror_lang_vue_vueLanguage: typeof vueLanguage;
declare namespace _codemirror_lang_vue {
  export {
    vue$1 as vue,
    _codemirror_lang_vue_vueLanguage as vueLanguage,
  };
}

declare const parser: Parser

declare const svelteLanguage: LRLanguage;
declare function svelte$1(): LanguageSupport;

declare const _replit_codemirror_lang_svelte_svelteLanguage: typeof svelteLanguage;
declare namespace _replit_codemirror_lang_svelte {
  export {
    svelte$1 as svelte,
    _replit_codemirror_lang_svelte_svelteLanguage as svelteLanguage,
    parser as svelteParser,
  };
}

/**
Completion source that looks up locally defined names in
Python code.
*/
declare function localCompletionSource$1(context: CompletionContext): CompletionResult | null;
/**
Autocompletion for built-in Python globals and keywords.
*/
declare const globalCompletion: CompletionSource;

/**
A language provider based on the [Lezer Python
parser](https://github.com/lezer-parser/python), extended with
highlighting and indentation information.
*/
declare const pythonLanguage: LRLanguage;
/**
Python language support.
*/
declare function python$1(): LanguageSupport;

declare const _codemirror_lang_python_globalCompletion: typeof globalCompletion;
declare const _codemirror_lang_python_pythonLanguage: typeof pythonLanguage;
declare namespace _codemirror_lang_python {
  export {
    _codemirror_lang_python_globalCompletion as globalCompletion,
    localCompletionSource$1 as localCompletionSource,
    python$1 as python,
    _codemirror_lang_python_pythonLanguage as pythonLanguage,
  };
}

/**
A language provider based on the [Lezer PHP
parser](https://github.com/lezer-parser/php), extended with
highlighting and indentation information.
*/
declare const phpLanguage: LRLanguage;
/**
PHP language support.
*/
declare function php$1(config?: {
    /**
    By default, the parser will treat content outside of `<?` and
    `?>` markers as HTML. You can pass a different language here to
    change that. Explicitly passing disables parsing of such content.
    */
    baseLanguage?: Language | null;
    /**
    By default, PHP parsing only starts at the first `<?` marker.
    When you set this to true, it starts immediately at the start of
    the document.
    */
    plain?: boolean;
}): LanguageSupport;

declare const _codemirror_lang_php_phpLanguage: typeof phpLanguage;
declare namespace _codemirror_lang_php {
  export {
    php$1 as php,
    _codemirror_lang_php_phpLanguage as phpLanguage,
  };
}

declare class LeafBlock {
    readonly start: number;
    content: string;
    parsers: LeafBlockParser[];
}
declare class Line {
    text: string;
    baseIndent: number;
    basePos: number;
    pos: number;
    indent: number;
    next: number;
    skipSpace(from: number): number;
    moveBase(to: number): void;
    moveBaseColumn(indent: number): void;
    addMarker(elt: Element$1): void;
    countIndent(to: number, from?: number, indent?: number): number;
    findColumn(goal: number): number;
}
declare type BlockResult = boolean | null;
declare class BlockContext implements PartialParse {
    readonly parser: MarkdownParser;
    private line;
    private atEnd;
    private fragments;
    private to;
    stoppedAt: number | null;
    lineStart: number;
    get parsedPos(): number;
    advance(): Tree;
    stopAt(pos: number): void;
    private reuseFragment;
    get depth(): number;
    parentType(depth?: number): NodeType;
    nextLine(): boolean;
    private moveRangeI;
    private lineChunkAt;
    prevLineEnd(): number;
    startComposite(type: string, start: number, value?: number): void;
    addElement(elt: Element$1): void;
    addLeafElement(leaf: LeafBlock, elt: Element$1): void;
    private finish;
    private addGaps;
    elt(type: string, from: number, to: number, children?: readonly Element$1[]): Element$1;
    elt(tree: Tree, at: number): Element$1;
}
interface NodeSpec {
    name: string;
    block?: boolean;
    composite?(cx: BlockContext, line: Line, value: number): boolean;
    style?: Tag | readonly Tag[] | {
        [selector: string]: Tag | readonly Tag[];
    };
}
interface InlineParser {
    name: string;
    parse(cx: InlineContext, next: number, pos: number): number;
    before?: string;
    after?: string;
}
interface BlockParser {
    name: string;
    parse?(cx: BlockContext, line: Line): BlockResult;
    leaf?(cx: BlockContext, leaf: LeafBlock): LeafBlockParser | null;
    endLeaf?(cx: BlockContext, line: Line, leaf: LeafBlock): boolean;
    before?: string;
    after?: string;
}
interface LeafBlockParser {
    nextLine(cx: BlockContext, line: Line, leaf: LeafBlock): boolean;
    finish(cx: BlockContext, leaf: LeafBlock): boolean;
}
interface MarkdownConfig {
    props?: readonly NodePropSource[];
    defineNodes?: readonly (string | NodeSpec)[];
    parseBlock?: readonly BlockParser[];
    parseInline?: readonly InlineParser[];
    remove?: readonly string[];
    wrap?: ParseWrapper;
}
declare type MarkdownExtension = MarkdownConfig | readonly MarkdownExtension[];
declare class MarkdownParser extends Parser {
    readonly nodeSet: NodeSet;
    createParse(input: Input, fragments: readonly TreeFragment[], ranges: readonly {
        from: number;
        to: number;
    }[]): PartialParse;
    configure(spec: MarkdownExtension): MarkdownParser;
    parseInline(text: string, offset: number): any[];
}
declare class Element$1 {
    readonly type: number;
    readonly from: number;
    readonly to: number;
}
interface DelimiterType {
    resolve?: string;
    mark?: string;
}
declare class InlineContext {
    readonly parser: MarkdownParser;
    readonly text: string;
    readonly offset: number;
    char(pos: number): number;
    get end(): number;
    slice(from: number, to: number): string;
    addDelimiter(type: DelimiterType, from: number, to: number, open: boolean, close: boolean): number;
    addElement(elt: Element$1): number;
    findOpeningDelimiter(type: DelimiterType): number;
    takeContent(startIndex: number): any[];
    skipSpace(from: number): number;
    elt(type: string, from: number, to: number, children?: readonly Element$1[]): Element$1;
    elt(tree: Tree, at: number): Element$1;
}

/**
Language support for strict CommonMark.
*/
declare const commonmarkLanguage: Language;
/**
Language support for [GFM](https://github.github.com/gfm/) plus
subscript, superscript, and emoji syntax.
*/
declare const markdownLanguage: Language;

/**
This command, when invoked in Markdown context with cursor
selection(s), will create a new line with the markup for
blockquotes and lists that were active on the old line. If the
cursor was directly after the end of the markup for the old line,
trailing whitespace and list markers are removed from that line.

The command does nothing in non-Markdown context, so it should
not be used as the only binding for Enter (even in a Markdown
document, HTML and code regions might use a different language).
*/
declare const insertNewlineContinueMarkup: StateCommand;
/**
This command will, when invoked in a Markdown context with the
cursor directly after list or blockquote markup, delete one level
of markup. When the markup is for a list, it will be replaced by
spaces on the first invocation (a further invocation will delete
the spaces), to make it easy to continue a list.

When not after Markdown block markup, this command will return
false, so it is intended to be bound alongside other deletion
commands, with a higher precedence than the more generic commands.
*/
declare const deleteMarkupBackward: StateCommand;

/**
A small keymap with Markdown-specific bindings. Binds Enter to
[`insertNewlineContinueMarkup`](https://codemirror.net/6/docs/ref/#lang-markdown.insertNewlineContinueMarkup)
and Backspace to
[`deleteMarkupBackward`](https://codemirror.net/6/docs/ref/#lang-markdown.deleteMarkupBackward).
*/
declare const markdownKeymap: readonly KeyBinding[];
/**
Markdown language support.
*/
declare function markdown$1(config?: {
    /**
    When given, this language will be used by default to parse code
    blocks.
    */
    defaultCodeLanguage?: Language | LanguageSupport;
    /**
    A source of language support for highlighting fenced code
    blocks. When it is an array, the parser will use
    [`LanguageDescription.matchLanguageName`](https://codemirror.net/6/docs/ref/#language.LanguageDescription^matchLanguageName)
    with the fenced code info to find a matching language. When it
    is a function, will be called with the info string and may
    return a language or `LanguageDescription` object.
    */
    codeLanguages?: readonly LanguageDescription[] | ((info: string) => Language | LanguageDescription | null);
    /**
    Set this to false to disable installation of the Markdown
    [keymap](https://codemirror.net/6/docs/ref/#lang-markdown.markdownKeymap).
    */
    addKeymap?: boolean;
    /**
    Markdown parser
    [extensions](https://github.com/lezer-parser/markdown#user-content-markdownextension)
    to add to the parser.
    */
    extensions?: MarkdownExtension;
    /**
    The base language to use. Defaults to
    [`commonmarkLanguage`](https://codemirror.net/6/docs/ref/#lang-markdown.commonmarkLanguage).
    */
    base?: Language;
}): LanguageSupport;

declare const _codemirror_lang_markdown_commonmarkLanguage: typeof commonmarkLanguage;
declare const _codemirror_lang_markdown_deleteMarkupBackward: typeof deleteMarkupBackward;
declare const _codemirror_lang_markdown_insertNewlineContinueMarkup: typeof insertNewlineContinueMarkup;
declare const _codemirror_lang_markdown_markdownKeymap: typeof markdownKeymap;
declare const _codemirror_lang_markdown_markdownLanguage: typeof markdownLanguage;
declare namespace _codemirror_lang_markdown {
  export {
    _codemirror_lang_markdown_commonmarkLanguage as commonmarkLanguage,
    _codemirror_lang_markdown_deleteMarkupBackward as deleteMarkupBackward,
    _codemirror_lang_markdown_insertNewlineContinueMarkup as insertNewlineContinueMarkup,
    markdown$1 as markdown,
    _codemirror_lang_markdown_markdownKeymap as markdownKeymap,
    _codemirror_lang_markdown_markdownLanguage as markdownLanguage,
  };
}

/**
Describes a problem or hint for a piece of code.
*/
interface Diagnostic {
    /**
    The start position of the relevant text.
    */
    from: number;
    /**
    The end position. May be equal to `from`, though actually
    covering text is preferable.
    */
    to: number;
    /**
    The severity of the problem. This will influence how it is
    displayed.
    */
    severity: "info" | "warning" | "error";
    /**
    An optional source string indicating where the diagnostic is
    coming from. You can put the name of your linter here, if
    applicable.
    */
    source?: string;
    /**
    The message associated with this diagnostic.
    */
    message: string;
    /**
    An optional custom rendering function that displays the message
    as a DOM node.
    */
    renderMessage?: () => Node;
    /**
    An optional array of actions that can be taken on this
    diagnostic.
    */
    actions?: readonly Action[];
}
/**
An action associated with a diagnostic.
*/
interface Action {
    /**
    The label to show to the user. Should be relatively short.
    */
    name: string;
    /**
    The function to call when the user activates this action. Is
    given the diagnostic's _current_ position, which may have
    changed since the creation of the diagnostic, due to editing.
    */
    apply: (view: EditorView, from: number, to: number) => void;
}

/**
Calls
[`JSON.parse`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse)
on the document and, if that throws an error, reports it as a
single diagnostic.
*/
declare const jsonParseLinter: () => (view: EditorView) => Diagnostic[];

/**
A language provider that provides JSON parsing.
*/
declare const jsonLanguage: LRLanguage;
/**
JSON language support.
*/
declare function json$1(): LanguageSupport;

declare const _codemirror_lang_json_jsonLanguage: typeof jsonLanguage;
declare const _codemirror_lang_json_jsonParseLinter: typeof jsonParseLinter;
declare namespace _codemirror_lang_json {
  export {
    json$1 as json,
    _codemirror_lang_json_jsonLanguage as jsonLanguage,
    _codemirror_lang_json_jsonParseLinter as jsonParseLinter,
  };
}

/**
A language provider based on the [Lezer Java
parser](https://github.com/lezer-parser/java), extended with
highlighting and indentation information.
*/
declare const javaLanguage: LRLanguage;
/**
Java language support.
*/
declare function java$1(): LanguageSupport;

declare const _codemirror_lang_java_javaLanguage: typeof javaLanguage;
declare namespace _codemirror_lang_java {
  export {
    java$1 as java,
    _codemirror_lang_java_javaLanguage as javaLanguage,
  };
}

/**
A language provider based on the [Lezer C++
parser](https://github.com/lezer-parser/cpp), extended with
highlighting and indentation information.
*/
declare const cppLanguage: LRLanguage;
/**
Language support for C++.
*/
declare function cpp$1(): LanguageSupport;

declare const _codemirror_lang_cpp_cppLanguage: typeof cppLanguage;
declare namespace _codemirror_lang_cpp {
  export {
    cpp$1 as cpp,
    _codemirror_lang_cpp_cppLanguage as cppLanguage,
  };
}

/**
A language provider for Angular Templates.
*/
declare const angularLanguage: LRLanguage;
/**
Angular Template language support.
*/
declare function angular$1(): LanguageSupport;

declare const _codemirror_lang_angular_angularLanguage: typeof angularLanguage;
declare namespace _codemirror_lang_angular {
  export {
    angular$1 as angular,
    _codemirror_lang_angular_angularLanguage as angularLanguage,
  };
}

/**
Comment or uncomment the current selection. Will use line comments
if available, otherwise falling back to block comments.
*/
declare const toggleComment: StateCommand;
interface HistoryConfig {
    /**
    The minimum depth (amount of events) to store. Defaults to 100.
    */
    minDepth?: number;
    /**
    The maximum time (in milliseconds) that adjacent events can be
    apart and still be grouped together. Defaults to 500.
    */
    newGroupDelay?: number;
    /**
    By default, when close enough together in time, changes are
    joined into an existing undo event if they touch any of the
    changed ranges from that event. You can pass a custom predicate
    here to influence that logic.
    */
    joinToEvent?: (tr: Transaction, isAdjacent: boolean) => boolean;
}
/**
Create a history extension with the given configuration.
*/
declare function history(config?: HistoryConfig): Extension;
/**
Undo a single group of history events. Returns false if no group
was available.
*/
declare const undo: StateCommand;
/**
Redo a group of history events. Returns false if no group was
available.
*/
declare const redo: StateCommand;
/**
Undo a change or selection change.
*/
declare const undoSelection: StateCommand;
/**
Redo a change or selection change.
*/
declare const redoSelection: StateCommand;
/**
Default key bindings for the undo history.

- Mod-z: [`undo`](https://codemirror.net/6/docs/ref/#commands.undo).
- Mod-y (Mod-Shift-z on macOS) + Ctrl-Shift-z on Linux: [`redo`](https://codemirror.net/6/docs/ref/#commands.redo).
- Mod-u: [`undoSelection`](https://codemirror.net/6/docs/ref/#commands.undoSelection).
- Alt-u (Mod-Shift-u on macOS): [`redoSelection`](https://codemirror.net/6/docs/ref/#commands.redoSelection).
*/
declare const historyKeymap: readonly KeyBinding[];
/**
Move the selection one group or camel-case subword forward.
*/
declare const cursorSubwordForward: Command;
/**
Move the selection one group or camel-case subword backward.
*/
declare const cursorSubwordBackward: Command;
/**
Move the selection to the bracket matching the one it is currently
on, if any.
*/
declare const cursorMatchingBracket: StateCommand;
/**
Extend the selection to the bracket matching the one the selection
head is currently on, if any.
*/
declare const selectMatchingBracket: StateCommand;
/**
Move the selection head one group or camel-case subword forward.
*/
declare const selectSubwordForward: Command;
/**
Move the selection head one group or subword backward.
*/
declare const selectSubwordBackward: Command;
/**
Replace the selection with a newline and indent the newly created
line(s). If the current line consists only of whitespace, this
will also delete that whitespace. When the cursor is between
matching brackets, an additional newline will be inserted after
the cursor.
*/
declare const insertNewlineAndIndent: StateCommand;
/**
Add a [unit](https://codemirror.net/6/docs/ref/#language.indentUnit) of indentation to all selected
lines.
*/
declare const indentMore: StateCommand;
/**
Remove a [unit](https://codemirror.net/6/docs/ref/#language.indentUnit) of indentation from all
selected lines.
*/
declare const indentLess: StateCommand;
/**
An array of key bindings closely sticking to platform-standard or
widely used bindings. (This includes the bindings from
[`emacsStyleKeymap`](https://codemirror.net/6/docs/ref/#commands.emacsStyleKeymap), with their `key`
property changed to `mac`.)

 - ArrowLeft: [`cursorCharLeft`](https://codemirror.net/6/docs/ref/#commands.cursorCharLeft) ([`selectCharLeft`](https://codemirror.net/6/docs/ref/#commands.selectCharLeft) with Shift)
 - ArrowRight: [`cursorCharRight`](https://codemirror.net/6/docs/ref/#commands.cursorCharRight) ([`selectCharRight`](https://codemirror.net/6/docs/ref/#commands.selectCharRight) with Shift)
 - Ctrl-ArrowLeft (Alt-ArrowLeft on macOS): [`cursorGroupLeft`](https://codemirror.net/6/docs/ref/#commands.cursorGroupLeft) ([`selectGroupLeft`](https://codemirror.net/6/docs/ref/#commands.selectGroupLeft) with Shift)
 - Ctrl-ArrowRight (Alt-ArrowRight on macOS): [`cursorGroupRight`](https://codemirror.net/6/docs/ref/#commands.cursorGroupRight) ([`selectGroupRight`](https://codemirror.net/6/docs/ref/#commands.selectGroupRight) with Shift)
 - Cmd-ArrowLeft (on macOS): [`cursorLineStart`](https://codemirror.net/6/docs/ref/#commands.cursorLineStart) ([`selectLineStart`](https://codemirror.net/6/docs/ref/#commands.selectLineStart) with Shift)
 - Cmd-ArrowRight (on macOS): [`cursorLineEnd`](https://codemirror.net/6/docs/ref/#commands.cursorLineEnd) ([`selectLineEnd`](https://codemirror.net/6/docs/ref/#commands.selectLineEnd) with Shift)
 - ArrowUp: [`cursorLineUp`](https://codemirror.net/6/docs/ref/#commands.cursorLineUp) ([`selectLineUp`](https://codemirror.net/6/docs/ref/#commands.selectLineUp) with Shift)
 - ArrowDown: [`cursorLineDown`](https://codemirror.net/6/docs/ref/#commands.cursorLineDown) ([`selectLineDown`](https://codemirror.net/6/docs/ref/#commands.selectLineDown) with Shift)
 - Cmd-ArrowUp (on macOS): [`cursorDocStart`](https://codemirror.net/6/docs/ref/#commands.cursorDocStart) ([`selectDocStart`](https://codemirror.net/6/docs/ref/#commands.selectDocStart) with Shift)
 - Cmd-ArrowDown (on macOS): [`cursorDocEnd`](https://codemirror.net/6/docs/ref/#commands.cursorDocEnd) ([`selectDocEnd`](https://codemirror.net/6/docs/ref/#commands.selectDocEnd) with Shift)
 - Ctrl-ArrowUp (on macOS): [`cursorPageUp`](https://codemirror.net/6/docs/ref/#commands.cursorPageUp) ([`selectPageUp`](https://codemirror.net/6/docs/ref/#commands.selectPageUp) with Shift)
 - Ctrl-ArrowDown (on macOS): [`cursorPageDown`](https://codemirror.net/6/docs/ref/#commands.cursorPageDown) ([`selectPageDown`](https://codemirror.net/6/docs/ref/#commands.selectPageDown) with Shift)
 - PageUp: [`cursorPageUp`](https://codemirror.net/6/docs/ref/#commands.cursorPageUp) ([`selectPageUp`](https://codemirror.net/6/docs/ref/#commands.selectPageUp) with Shift)
 - PageDown: [`cursorPageDown`](https://codemirror.net/6/docs/ref/#commands.cursorPageDown) ([`selectPageDown`](https://codemirror.net/6/docs/ref/#commands.selectPageDown) with Shift)
 - Home: [`cursorLineBoundaryBackward`](https://codemirror.net/6/docs/ref/#commands.cursorLineBoundaryBackward) ([`selectLineBoundaryBackward`](https://codemirror.net/6/docs/ref/#commands.selectLineBoundaryBackward) with Shift)
 - End: [`cursorLineBoundaryForward`](https://codemirror.net/6/docs/ref/#commands.cursorLineBoundaryForward) ([`selectLineBoundaryForward`](https://codemirror.net/6/docs/ref/#commands.selectLineBoundaryForward) with Shift)
 - Ctrl-Home (Cmd-Home on macOS): [`cursorDocStart`](https://codemirror.net/6/docs/ref/#commands.cursorDocStart) ([`selectDocStart`](https://codemirror.net/6/docs/ref/#commands.selectDocStart) with Shift)
 - Ctrl-End (Cmd-Home on macOS): [`cursorDocEnd`](https://codemirror.net/6/docs/ref/#commands.cursorDocEnd) ([`selectDocEnd`](https://codemirror.net/6/docs/ref/#commands.selectDocEnd) with Shift)
 - Enter: [`insertNewlineAndIndent`](https://codemirror.net/6/docs/ref/#commands.insertNewlineAndIndent)
 - Ctrl-a (Cmd-a on macOS): [`selectAll`](https://codemirror.net/6/docs/ref/#commands.selectAll)
 - Backspace: [`deleteCharBackward`](https://codemirror.net/6/docs/ref/#commands.deleteCharBackward)
 - Delete: [`deleteCharForward`](https://codemirror.net/6/docs/ref/#commands.deleteCharForward)
 - Ctrl-Backspace (Alt-Backspace on macOS): [`deleteGroupBackward`](https://codemirror.net/6/docs/ref/#commands.deleteGroupBackward)
 - Ctrl-Delete (Alt-Delete on macOS): [`deleteGroupForward`](https://codemirror.net/6/docs/ref/#commands.deleteGroupForward)
 - Cmd-Backspace (macOS): [`deleteToLineStart`](https://codemirror.net/6/docs/ref/#commands.deleteToLineStart).
 - Cmd-Delete (macOS): [`deleteToLineEnd`](https://codemirror.net/6/docs/ref/#commands.deleteToLineEnd).
*/
declare const standardKeymap: readonly KeyBinding[];

/**
CSS property, variable, and value keyword completion source.
*/
declare const cssCompletionSource: CompletionSource;

/**
A language provider based on the [Lezer CSS
parser](https://github.com/lezer-parser/css), extended with
highlighting and indentation information.
*/
declare const cssLanguage: LRLanguage;
/**
Language support for CSS.
*/
declare function css(): LanguageSupport;

declare const index_d$2_css: typeof css;
declare const index_d$2_cssCompletionSource: typeof cssCompletionSource;
declare const index_d$2_cssLanguage: typeof cssLanguage;
declare namespace index_d$2 {
  export {
    index_d$2_css as css,
    index_d$2_cssCompletionSource as cssCompletionSource,
    index_d$2_cssLanguage as cssLanguage,
  };
}

/**
Type used to specify tags to complete.
*/
interface TagSpec {
    /**
    Define tag-specific attributes. Property names are attribute
    names, and property values can be null to indicate free-form
    attributes, or a list of strings for suggested attribute values.
    */
    attrs?: Record<string, null | readonly string[]>;
    /**
    When set to false, don't complete global attributes on this tag.
    */
    globalAttrs?: boolean;
    /**
    Can be used to specify a list of child tags that are valid
    inside this tag. The default is to allow any tag.
    */
    children?: readonly string[];
}
/**
HTML tag completion. Opens and closes tags and attributes in a
context-aware way.
*/
declare function htmlCompletionSource(context: CompletionContext): CompletionResult | null;
/**
Create a completion source for HTML extended with additional tags
or attributes.
*/
declare function htmlCompletionSourceWith(config: {
    /**
    Define extra tag names to complete.
    */
    extraTags?: Record<string, TagSpec>;
    /**
    Add global attributes that are available on all tags.
    */
    extraGlobalAttributes?: Record<string, null | readonly string[]>;
}): (context: CompletionContext) => CompletionResult | null;

declare type NestedLang = {
    tag: string;
    attrs?: (attrs: {
        [attr: string]: string;
    }) => boolean;
    parser: Parser;
};
declare type NestedAttr = {
    name: string;
    tagName?: string;
    parser: Parser;
};
/**
A language provider based on the [Lezer HTML
parser](https://github.com/lezer-parser/html), extended with the
JavaScript and CSS parsers to parse the content of `<script>` and
`<style>` tags.
*/
declare const htmlLanguage: LRLanguage;
/**
Language support for HTML, including
[`htmlCompletion`](https://codemirror.net/6/docs/ref/#lang-html.htmlCompletion) and JavaScript and
CSS support extensions.
*/
declare function html(config?: {
    /**
    By default, the syntax tree will highlight mismatched closing
    tags. Set this to `false` to turn that off (for example when you
    expect to only be parsing a fragment of HTML text, not a full
    document).
    */
    matchClosingTags?: boolean;
    selfClosingTags?: boolean;
    /**
    Determines whether [`autoCloseTags`](https://codemirror.net/6/docs/ref/#lang-html.autoCloseTags)
    is included in the support extensions. Defaults to true.
    */
    autoCloseTags?: boolean;
    /**
    Add additional tags that can be completed.
    */
    extraTags?: Record<string, TagSpec>;
    /**
    Add additional completable attributes to all tags.
    */
    extraGlobalAttributes?: Record<string, null | readonly string[]>;
    /**
    Register additional languages to parse the content of specific
    tags. If given, `attrs` should be a function that, given an
    object representing the tag's attributes, returns `true` if this
    language applies.
    */
    nestedLanguages?: NestedLang[];
    /**
    Register additional languages to parse attribute values with.
    */
    nestedAttributes?: NestedAttr[];
}): LanguageSupport;
/**
Extension that will automatically insert close tags when a `>` or
`/` is typed.
*/
declare const autoCloseTags$1: Extension;

type index_d$1_TagSpec = TagSpec;
declare const index_d$1_html: typeof html;
declare const index_d$1_htmlCompletionSource: typeof htmlCompletionSource;
declare const index_d$1_htmlCompletionSourceWith: typeof htmlCompletionSourceWith;
declare const index_d$1_htmlLanguage: typeof htmlLanguage;
declare namespace index_d$1 {
  export {
    index_d$1_TagSpec as TagSpec,
    autoCloseTags$1 as autoCloseTags,
    index_d$1_html as html,
    index_d$1_htmlCompletionSource as htmlCompletionSource,
    index_d$1_htmlCompletionSourceWith as htmlCompletionSourceWith,
    index_d$1_htmlLanguage as htmlLanguage,
  };
}

/**
A language provider based on the [Lezer JavaScript
parser](https://github.com/lezer-parser/javascript), extended with
highlighting and indentation information.
*/
declare const javascriptLanguage: LRLanguage;
/**
A language provider for TypeScript.
*/
declare const typescriptLanguage: LRLanguage;
/**
Language provider for JSX.
*/
declare const jsxLanguage: LRLanguage;
/**
Language provider for JSX + TypeScript.
*/
declare const tsxLanguage: LRLanguage;
/**
JavaScript support. Includes [snippet](https://codemirror.net/6/docs/ref/#lang-javascript.snippets)
completion.
*/
declare function javascript(config?: {
    jsx?: boolean;
    typescript?: boolean;
}): LanguageSupport;
/**
Extension that will automatically insert JSX close tags when a `>` or
`/` is typed.
*/
declare const autoCloseTags: Extension;

/**
A collection of JavaScript-related
[snippets](https://codemirror.net/6/docs/ref/#autocomplete.snippet).
*/
declare const snippets: readonly Completion[];

/**
Connects an [ESLint](https://eslint.org/) linter to CodeMirror's
[lint](https://codemirror.net/6/docs/ref/#lint) integration. `eslint` should be an instance of the
[`Linter`](https://eslint.org/docs/developer-guide/nodejs-api#linter)
class, and `config` an optional ESLint configuration. The return
value of this function can be passed to [`linter`](https://codemirror.net/6/docs/ref/#lint.linter)
to create a JavaScript linting extension.

Note that ESLint targets node, and is tricky to run in the
browser. The
[eslint-linter-browserify](https://github.com/UziTech/eslint-linter-browserify)
package may help with that (see
[example](https://github.com/UziTech/eslint-linter-browserify/blob/master/example/script.js)).
*/
declare function esLint(eslint: any, config?: any): (view: EditorView) => Diagnostic[];

/**
Completion source that looks up locally defined names in
JavaScript code.
*/
declare function localCompletionSource(context: CompletionContext): CompletionResult | null;
/**
Helper function for defining JavaScript completion sources. It
returns the completable name and object path for a completion
context, or null if no name/property completion should happen at
that position. For example, when completing after `a.b.c` it will
return `{path: ["a", "b"], name: "c"}`. When completing after `x`
it will return `{path: [], name: "x"}`. When not in a property or
name, it will return null if `context.explicit` is false, and
`{path: [], name: ""}` otherwise.
*/
declare function completionPath(context: CompletionContext): {
    path: readonly string[];
    name: string;
} | null;
/**
Defines a [completion source](https://codemirror.net/6/docs/ref/#autocomplete.CompletionSource) that
completes from the given scope object (for example `globalThis`).
Will enter properties of the object when completing properties on
a directly-named path.
*/
declare function scopeCompletionSource(scope: any): CompletionSource;

declare const index_d_autoCloseTags: typeof autoCloseTags;
declare const index_d_completionPath: typeof completionPath;
declare const index_d_esLint: typeof esLint;
declare const index_d_javascript: typeof javascript;
declare const index_d_javascriptLanguage: typeof javascriptLanguage;
declare const index_d_jsxLanguage: typeof jsxLanguage;
declare const index_d_localCompletionSource: typeof localCompletionSource;
declare const index_d_scopeCompletionSource: typeof scopeCompletionSource;
declare const index_d_snippets: typeof snippets;
declare const index_d_tsxLanguage: typeof tsxLanguage;
declare const index_d_typescriptLanguage: typeof typescriptLanguage;
declare namespace index_d {
  export {
    index_d_autoCloseTags as autoCloseTags,
    index_d_completionPath as completionPath,
    index_d_esLint as esLint,
    index_d_javascript as javascript,
    index_d_javascriptLanguage as javascriptLanguage,
    index_d_jsxLanguage as jsxLanguage,
    index_d_localCompletionSource as localCompletionSource,
    index_d_scopeCompletionSource as scopeCompletionSource,
    index_d_snippets as snippets,
    index_d_tsxLanguage as tsxLanguage,
    index_d_typescriptLanguage as typescriptLanguage,
  };
}

declare type HighlightOptions = {
    /**
    Determines whether, when nothing is selected, the word around
    the cursor is matched instead. Defaults to false.
    */
    highlightWordAroundCursor?: boolean;
    /**
    The minimum length of the selection before it is highlighted.
    Defaults to 1 (always highlight non-cursor selections).
    */
    minSelectionLength?: number;
    /**
    The amount of matches (in the viewport) at which to disable
    highlighting. Defaults to 100.
    */
    maxMatches?: number;
    /**
    Whether to only highlight whole words.
    */
    wholeWords?: boolean;
};
/**
This extension highlights text that matches the selection. It uses
the `"cm-selectionMatch"` class for the highlighting. When
`highlightWordAroundCursor` is enabled, the word at the cursor
itself will be highlighted with `"cm-selectionMatch-main"`.
*/
declare function highlightSelectionMatches(options?: HighlightOptions): Extension;
/**
Select next occurrence of the current selection. Expand selection
to the surrounding word when the selection is empty.
*/
declare const selectNextOccurrence: StateCommand;

declare function angular(): Promise<typeof _codemirror_lang_angular>;
declare function clojure(): Promise<StreamLanguage<unknown>>;
declare function coffeescript(): Promise<StreamLanguage<unknown>>;
declare function cpp(): Promise<typeof _codemirror_lang_cpp>;
declare function dart(): Promise<StreamLanguage<unknown>>;
declare function gss(): Promise<StreamLanguage<unknown>>;
declare function go(): Promise<StreamLanguage<unknown>>;
declare function java(): Promise<typeof _codemirror_lang_java>;
declare function json(): Promise<typeof _codemirror_lang_json>;
declare function kotlin(): Promise<StreamLanguage<unknown>>;
declare function less(): Promise<StreamLanguage<unknown>>;
declare function markdown(): Promise<typeof _codemirror_lang_markdown>;
declare function php(): Promise<typeof _codemirror_lang_php>;
declare function python(): Promise<typeof _codemirror_lang_python>;
declare function sass(): Promise<StreamLanguage<unknown>>;
declare function scala(): Promise<StreamLanguage<unknown>>;
declare function scss(): Promise<StreamLanguage<unknown>>;
declare function shell(): Promise<StreamLanguage<unknown>>;
declare function svelte(): Promise<typeof _replit_codemirror_lang_svelte>;
declare function cssStreamParser(): Promise<any>;
declare function vue(): Promise<typeof _codemirror_lang_vue>;
declare function wast(): Promise<typeof _codemirror_lang_wast>;
declare function xml(): Promise<typeof _codemirror_lang_xml>;

export { Annotation, AnnotationType, ChangeDesc, ChangeSet, ChangeSpec, Command, Compartment, Completion, CompletionContext, CompletionResult, CompletionSource, Decoration, DecorationSet, EditorSelection, EditorState, EditorStateConfig, EditorView, Extension, Facet, GutterMarker, HighlightStyle, KeyBinding, LRParser, Language, LanguageSupport, Line$1 as Line, MapMode, MatchDecorator, NodeProp, NodeSet, NodeType, Panel, Parser, Prec, Range, RangeSet, RangeSetBuilder, SelectionRange, StateEffect, StateEffectType, StateField, StreamLanguage, StreamParser, StringStream, StyleModule, SyntaxNode, Tag, TagStyle, Text, TextIterator, Tooltip, TooltipView, Transaction, TransactionSpec, Tree, TreeCursor, ViewPlugin, ViewUpdate, WidgetType, acceptCompletion, angular, autocompletion, bracketMatching, clojure, closeBrackets, closeBracketsKeymap, closeCompletion, codeFolding, coffeescript, completeAnyWord, completionStatus, cpp, index_d$2 as css, cssStreamParser, currentCompletions, cursorMatchingBracket, cursorSubwordBackward, cursorSubwordForward, dart, drawSelection, ensureSyntaxTree, foldGutter, foldKeymap, go, gss, gutter, gutters, highlightSelectionMatches, highlightSpecialChars, highlightTree, history, historyKeymap, index_d$1 as html, ifNotIn, indentLess, indentMore, indentOnInput, indentUnit, insertNewlineAndIndent, java, index_d as javascript, json, keymap, kotlin, less, lineNumberMarkers, lineNumbers, markdown, moveCompletionSelection, php, placeholder, python, redo, redoSelection, repositionTooltips, sass, scala, scrollPastEnd, scss, selectMatchingBracket, selectNextOccurrence, selectSubwordBackward, selectSubwordForward, selectedCompletion, selectedCompletionIndex, shell, showPanel, showTooltip, standardKeymap, startCompletion, svelte, syntaxHighlighting, syntaxTree, tags, toggleComment, tooltips, undo, undoSelection, vue, wast, xml };
