import { ShellApiWithMongoClass } from './decorators';
import type Mongo from './mongo';
import type { Document, ServiceProviderFindCursor, ServiceProviderAggregationCursor, ServiceProviderRunCommandCursor, ServiceProviderBaseCursor } from '@mongosh/service-provider-core';
import { asPrintable } from './enums';
import { CursorIterationResult } from './result';
export declare abstract class BaseCursor<CursorType extends ServiceProviderBaseCursor> extends ShellApiWithMongoClass {
    _mongo: Mongo;
    _cursor: CursorType;
    _transform: ((doc: any) => any) | null;
    _blockingWarningDisabled: boolean;
    constructor(mongo: Mongo, cursor: CursorType);
    close(): Promise<void>;
    forEach(f: (doc: Document) => void | boolean | Promise<void> | Promise<boolean>): Promise<void>;
    hasNext(): Promise<boolean>;
    tryNext(): Promise<Document | null>;
    _tryNext(): Promise<Document | null>;
    _canDelegateIterationToUnderlyingCursor(): boolean;
    [Symbol.asyncIterator](): AsyncGenerator<Document, void, void>;
    isClosed(): boolean;
    isExhausted(): boolean;
    itcount(): Promise<number>;
    pretty(): this;
    map(f: (doc: Document) => Document): this;
    next(): Promise<Document | null>;
    disableBlockWarnings(): this;
    abstract batchSize(size: number): this;
    abstract toArray(): Promise<Document[]>;
    abstract maxTimeMS(value: number): this;
    abstract objsLeftInBatch(): number;
    abstract _it(): Promise<CursorIterationResult>;
}
export declare abstract class AbstractFiniteCursor<CursorType extends ServiceProviderAggregationCursor | ServiceProviderFindCursor | ServiceProviderRunCommandCursor> extends BaseCursor<CursorType> {
    _currentIterationResult: CursorIterationResult | null;
    constructor(mongo: Mongo, cursor: CursorType);
    [asPrintable](): Promise<CursorIterationResult | string>;
    _it(): Promise<CursorIterationResult>;
    batchSize(size: number): this;
    toArray(): Promise<Document[]>;
    maxTimeMS(value: number): this;
    objsLeftInBatch(): number;
}
