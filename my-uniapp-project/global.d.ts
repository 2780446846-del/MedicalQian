/// <reference types="@dcloudio/types" />

// 全局类型声明

// 基础类型
type PropertyKey = string | number | symbol;

// 基础接口
interface PropertyDescriptor {
  configurable?: boolean;
  enumerable?: boolean;
  value?: any;
  writable?: boolean;
  get?(): any;
  set?(v: any): void;
}

interface PropertyDescriptorMap {
  [key: string]: PropertyDescriptor;
}

interface ThisType<T> {
  [key: string]: any;
}

interface ArrayLike<T> {
  length: number;
  [n: number]: T;
}

interface Iterable<T> {
  [Symbol.iterator](): Iterator<T>;
}

interface Iterator<T> {
  next(value?: any): IteratorResult<T>;
  return?(value?: any): IteratorResult<T>;
  throw?(e?: any): IteratorResult<T>;
}

interface IteratorResult<T> {
  done: boolean;
  value: T;
}

interface PromiseLike<T> {
  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): PromiseLike<TResult1 | TResult2>;
}

interface RegExpMatchArray extends Array<string> {
  index: number;
  input: string;
  groups?: { [key: string]: string };
}

interface TemplateStringsArray extends Array<string> {
  readonly raw: string[];
}

// 构造函数接口
interface ObjectConstructor {
  new(value?: any): Object;
  (value?: any): any;
  readonly prototype: Object;
  getPrototypeOf(o: any): any;
  getOwnPropertyDescriptor(o: any, p: PropertyKey): PropertyDescriptor | undefined;
  getOwnPropertyNames(o: any): string[];
  create(o: object | null): any;
  create(o: object | null, propertiesObject: PropertyDescriptorMap & ThisType<any>): any;
  defineProperty<T>(o: T, p: PropertyKey, attributes: PropertyDescriptor & ThisType<any>): T;
  defineProperties<T>(o: T, properties: PropertyDescriptorMap & ThisType<any>): T;
  seal<T>(o: T): T;
  freeze<T>(o: T): T;
  preventExtensions<T>(o: T): T;
  isExtensible(o: any): boolean;
  isSealed(o: any): boolean;
  isFrozen(o: any): boolean;
  keys(o: object): string[];
  entries(o: object): [string, any][];
  values(o: object): any[];
}

interface ArrayConstructor {
  new(arrayLength?: number): any[];
  new <T>(arrayLength: number): T[];
  new <T>(...items: T[]): T[];
  (arrayLength?: number): any[];
  <T>(arrayLength: number): T[];
  <T>(...items: T[]): T[];
  readonly prototype: Array<any>;
  isArray(arg: any): arg is any[];
  from<T>(arrayLike: ArrayLike<T>): T[];
  from<T, U>(arrayLike: ArrayLike<T>, mapfn: (v: T, k: number) => U, thisArg?: any): U[];
  of<T>(...items: T[]): T[];
}

interface StringConstructor {
  new(value?: any): String;
  (value?: any): string;
  readonly prototype: String;
  fromCharCode(...codes: number[]): string;
  fromCodePoint(...codePoints: number[]): string;
  raw(templateString: TemplateStringsArray, ...substitutions: any[]): string;
}

interface NumberConstructor {
  new(value?: any): Number;
  (value?: any): number;
  readonly prototype: Number;
  readonly MAX_VALUE: number;
  readonly MIN_VALUE: number;
  readonly NaN: number;
  readonly NEGATIVE_INFINITY: number;
  readonly POSITIVE_INFINITY: number;
  isFinite(number: number): boolean;
  isInteger(number: number): boolean;
  isNaN(number: number): boolean;
  isSafeInteger(number: number): boolean;
  parseInt(string: string, radix?: number): number;
  parseFloat(string: string): number;
  EPSILON: number;
  MAX_SAFE_INTEGER: number;
  MIN_SAFE_INTEGER: number;
}

interface BooleanConstructor {
  new(value?: any): Boolean;
  (value?: any): boolean;
  readonly prototype: Boolean;
}

interface DateConstructor {
  new(): Date;
  new(value: number | string | Date): Date;
  new(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): Date;
  (): string;
  readonly prototype: Date;
  now(): number;
  parse(string: string): number;
  UTC(year: number, month: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number): number;
}

interface ErrorConstructor {
  new(message?: string): Error;
  (message?: string): Error;
  readonly prototype: Error;
}

interface PromiseConstructor {
  new<T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
  <T>(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void): Promise<T>;
  readonly prototype: Promise<any>;
  resolve<T>(value?: T | PromiseLike<T>): Promise<T>;
  reject<T>(reason?: any): Promise<T>;
  all<T>(values: Iterable<T | PromiseLike<T>>): Promise<T[]>;
  race<T>(values: Iterable<T | PromiseLike<T>>): Promise<T>;
  allSettled<T>(values: Iterable<T | PromiseLike<T>>): Promise<PromiseSettledResult<T>[]>;
  any<T>(values: Iterable<T | PromiseLike<T>>): Promise<T>;
}

interface JSON {
  parse(text: string, reviver?: (key: any, value: any) => any): any;
  stringify(value: any, replacer?: (key: string, value: any) => any, space?: string | number): string;
}

interface Console {
  assert(condition?: boolean, ...data: any[]): void;
  clear(): void;
  count(label?: string): void;
  countReset(label?: string): void;
  debug(...data: any[]): void;
  dir(item?: any, options?: any): void;
  dirxml(...data: any[]): void;
  error(...data: any[]): void;
  group(...data: any[]): void;
  groupCollapsed(...data: any[]): void;
  groupEnd(): void;
  info(...data: any[]): void;
  log(...data: any[]): void;
  table(tabularData?: any, properties?: string[]): void;
  time(label?: string): void;
  timeEnd(label?: string): void;
  timeLog(label?: string, ...data: any[]): void;
  timeStamp(label?: string): void;
  trace(...data: any[]): void;
  warn(...data: any[]): void;
}

// 扩展 String 接口
interface String {
  padStart(targetLength: number, padString?: string): string;
  padEnd(targetLength: number, padString?: string): string;
  length: number;
  charAt(pos: number): string;
  charCodeAt(index: number): number;
  concat(...strings: string[]): string;
  indexOf(searchString: string, position?: number): number;
  lastIndexOf(searchString: string, position?: number): number;
  localeCompare(compareString: string, locales?: string | string[], options?: any): number;
  match(regexp: string | RegExp): RegExpMatchArray | null;
  replace(searchValue: string | RegExp, replaceValue: string | ((substring: string, ...args: any[]) => string)): string;
  search(regexp: string | RegExp): number;
  slice(start?: number, end?: number): string;
  split(separator: string | RegExp, limit?: number): string[];
  substring(start: number, end?: number): string;
  toLocaleLowerCase(locales?: string | string[]): string;
  toLocaleUpperCase(locales?: string | string[]): string;
  toLowerCase(): string;
  toUpperCase(): string;
  trim(): string;
  trimStart(): string;
  trimEnd(): string;
}

// 为 string 原始类型添加全局声明
declare global {
  interface String {
    padStart(targetLength: number, padString?: string): string;
    padEnd(targetLength: number, padString?: string): string;
  }
}

// Promise 类
class Promise<T> {
  constructor(executor: (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void);
  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): Promise<TResult1 | TResult2>;
  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): Promise<T | TResult>;
  finally(onfinally?: (() => void) | undefined | null): Promise<T>;
  static all<T>(values: Iterable<T | PromiseLike<T>>): Promise<T[]>;
  static race<T>(values: Iterable<T | PromiseLike<T>>): Promise<T>;
  static resolve<T>(value?: T | PromiseLike<T>): Promise<T>;
  static reject<T = never>(reason?: any): Promise<T>;
  static allSettled<T>(values: Iterable<T | PromiseLike<T>>): Promise<PromiseSettledResult<T>[]>;
  static any<T>(values: Iterable<T | PromiseLike<T>>): Promise<T>;
}

interface PromiseSettledResult<T> {
  status: 'fulfilled' | 'rejected';
  value?: T;
  reason?: any;
}

// IArguments
interface IArguments {
  [index: number]: any;
  length: number;
  callee: Function;
}

// 全局对象声明
declare const Object: ObjectConstructor;
declare const Array: ArrayConstructor;
declare const String: StringConstructor;
declare const Number: NumberConstructor;
declare const Boolean: BooleanConstructor;
declare const Date: DateConstructor;
declare const Error: ErrorConstructor;
declare const Promise: PromiseConstructor;
declare const JSON: JSON;
declare const console: Console;
declare const Math: {
  readonly E: number;
  readonly LN10: number;
  readonly LN2: number;
  readonly LOG2E: number;
  readonly LOG10E: number;
  readonly PI: number;
  readonly SQRT1_2: number;
  readonly SQRT2: number;
  abs(x: number): number;
  acos(x: number): number;
  acosh(x: number): number;
  asin(x: number): number;
  asinh(x: number): number;
  atan(x: number): number;
  atan2(y: number, x: number): number;
  atanh(x: number): number;
  cbrt(x: number): number;
  ceil(x: number): number;
  clz32(x: number): number;
  cos(x: number): number;
  cosh(x: number): number;
  exp(x: number): number;
  expm1(x: number): number;
  floor(x: number): number;
  fround(x: number): number;
  hypot(...values: number[]): number;
  imul(x: number, y: number): number;
  log(x: number): number;
  log1p(x: number): number;
  log10(x: number): number;
  log2(x: number): number;
  max(...values: number[]): number;
  min(...values: number[]): number;
  pow(x: number, y: number): number;
  random(): number;
  round(x: number): number;
  sign(x: number): number;
  sin(x: number): number;
  sinh(x: number): number;
  sqrt(x: number): number;
  tan(x: number): number;
  tanh(x: number): number;
  trunc(x: number): number;
};

// 全局函数声明
declare function encodeURIComponent(uriComponent: string): string;
declare function decodeURIComponent(uriComponent: string): string;
declare function parseFloat(string: string): number;
declare function parseInt(string: string, radix?: number): number;
declare function setTimeout(handler: (...args: any[]) => void, timeout: number, ...args: any[]): number;
declare function clearTimeout(id: number): void;
declare function setInterval(handler: (...args: any[]) => void, timeout: number, ...args: any[]): number;
declare function clearInterval(id: number): void;

// 全局对象声明
declare const window: {
  [key: string]: any;
};

declare const document: {
  [key: string]: any;
};

// 全局变量声明
declare const AMap: any;
declare const uni: any;
declare const plus: any;
declare function getCurrentPages(): any[];
declare function getApp(): any;

// Symbol 声明
declare const Symbol: {
  (description?: string | number): symbol;
  readonly prototype: Symbol;
  for(key: string): symbol;
  keyFor(sym: symbol): string | undefined;
  hasInstance: symbol;
  isConcatSpreadable: symbol;
  iterator: symbol;
  match: symbol;
  replace: symbol;
  search: symbol;
  species: symbol;
  split: symbol;
  toPrimitive: symbol;
  toStringTag: symbol;
  unscopables: symbol;
};

// RegExp 声明
declare const RegExp: {
  new(pattern: string | RegExp, flags?: string): RegExp;
  (pattern: string | RegExp, flags?: string): RegExp;
  readonly prototype: RegExp;
};

// Function 声明
declare const Function: {
  new(...args: string[]): Function;
  (...args: string[]): Function;
  readonly prototype: Function;
};

// 声明模块
declare module 'vue' {
  export function ref<T>(value: T): any;
  export function computed<T>(getter: () => T): any;
  export function onMounted(callback: () => void): any;
  export function watch<T>(source: T, callback: (newValue: T, oldValue: T) => void): any;
  export function onUnmounted(callback: () => void): any;
  export function onUpdated(callback: () => void): any;
  export function onBeforeMount(callback: () => void): any;
  export function reactive<T>(value: T): T;
  export function nextTick(callback?: () => void): Promise<void>;
  export interface DefineComponent {
    new(props?: any): any;
  }
  export const defineComponent: any;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

declare module '@/utils/webrtc' {}
declare module '@/config/webrtc' {}
declare module '@/utils/amapConfig.js' {
  export const AMAP_JS_KEY: string;
}
declare module '@/utils/location' {
  export interface LocationInfo {
    latitude: number;
    longitude: number;
    address?: string;
    city?: string;
    province?: string;
  }
  export function getUserLocation(): Promise<LocationInfo>;
  export function openMapNavigation(latitude: number, longitude: number, name: string): void;
  export function getUserLocationWithErrorHandling(): Promise<LocationInfo>;
  export function openMapNavigationWithFallback(latitude: number, longitude: number, name: string): void;
}

// 导出空对象以确保模块系统正确处理
export {};
