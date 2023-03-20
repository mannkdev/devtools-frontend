// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';

/**
 * Metadata to map between bytecode #offsets and line numbers in the
 * disassembly for WebAssembly modules.
 */

interface FunctionBodyOffset {
  start: number;
  end: number;
}
export class WasmDisassembly {
  readonly lines: string[][]; // TODO: try making private (MANN)
  // TODO: reduce chunk size?
  // TODO: change codemirror tree leaf/node threshold?
  readonly #offsets: number[][];
  readonly #chunkLineOffset: number[];
  #functionBodyOffsets: FunctionBodyOffset[];

  constructor(lines: string[][], offsets: number[][], functionBodyOffsets: FunctionBodyOffset[]) {
    if (lines.length !== offsets.length) {
      throw new Error('Lines and offsets don\'t match');
    }
    this.lines = lines;
    this.#offsets = offsets;
    this.#functionBodyOffsets = functionBodyOffsets;

    let N = 0;
    this.#chunkLineOffset = [];
    for (const chunk of this.#offsets) {
      this.#chunkLineOffset.push(N);
      N += chunk.length;
    }
    this.#chunkLineOffset.push(N);
  }

  get lineNumbers(): number {
    return this.#chunkLineOffset[this.#offsets.length];
  }

  bytecodeOffsetToLineNumber(bytecodeOffset: number): number {
    let left = 0;
    let right = this.#offsets.length;
    while (left < right) {
      const index = Math.floor((left + right) / 2);
      const chunk = this.#offsets[index];
      const foundIndex = Platform.ArrayUtilities.upperBound(
        chunk, bytecodeOffset, Platform.ArrayUtilities.DEFAULT_COMPARATOR);
      if(foundIndex == chunk.length) {
        if (index == this.#offsets.length - 1) {
          return this.#chunkLineOffset[index + 1] - 1;
        } else {
          const rightChunk = this.#offsets[index + 1];
          if(rightChunk[0] > bytecodeOffset) {
            return this.#chunkLineOffset[index + 1] - 1;
          }
        }
        left = index + 1;
      } else if (foundIndex > 0) {
        return this.#chunkLineOffset[index] + foundIndex - 1;
      } else { 
        if (index > 0) {
          const leftChunk = this.#offsets[index - 1];
          if (leftChunk[leftChunk.length - 1] <= bytecodeOffset) {
            return this.#chunkLineOffset[index] - 1;            
          }
        }
        right = index;        
      }
    }

    return 0;
  }

  lineNumberToBytecodeOffset(lineNumber: number): number {
    let remain = lineNumber;
    for (const chunk of this.#offsets) {
      if (remain < chunk.length) {
        return chunk[remain];
      }
      remain -= chunk.length;
    }
    return 0;
  }

  lineAt(lineNumber: number): string {
    let remain = lineNumber;
    for (const chunk of this.lines) {
      if (remain < chunk.length) {
        return chunk[remain];
      }
      remain -= chunk.length;
    }
    return '';
  }

  /**
   * returns an iterable enumerating all the non-breakable line numbers in the disassembly
   */
  * nonBreakableLineNumbers(): Iterable<number> {
    return [];
    /*
    let lineNumber = 0;
    let functionIndex = 0;
    while (lineNumber < this.lineNumbers) {
      if (functionIndex < this.#functionBodyOffsets.length) {
        const offset = this.lineNumberToBytecodeOffset(lineNumber);
        if (offset >= this.#functionBodyOffsets[functionIndex].start) {
          lineNumber = this.bytecodeOffsetToLineNumber(this.#functionBodyOffsets[functionIndex++].end) + 1;
          continue;
        }
      }
      yield lineNumber++;
    }
    */
  }
}
