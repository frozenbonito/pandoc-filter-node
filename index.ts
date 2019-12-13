/*! pandoc-filter-node | (C) 2014 Mike Henderson <mvhenderson@tds.net> | License: MIT */
/**
 * Javascript port of https://github.com/jgm/pandocfilters
 */
"use strict";

type PandocJson = {
	blocks: Block[];
	"pandoc-api-version": number[];
	meta: PandocMetaMap;
};
export type FilterAction = (
	ele: AnyElt,
	format: string,
	meta: PandocMetaMap,
) => void | AnyElt | Array<AnyElt>;

export type FilterActionAsync = (
	ele: AnyElt,
	format: string,
	meta: PandocMetaMap,
) => Promise<void | AnyElt | Array<AnyElt>>;

export type AttrList = Array<[string, string]>;

export type Attr = [string, Array<string>, AttrList];

export type MathType = { t: "DisplayMath" | "InlineMath" };
export type QuoteType = { t: "SingleQuote" | "DoubleQuote" };
export type Target = [string, string]; // [url, title]
export type Format = string;

export type CitationMode = {
	t: "AuthorInText" | "SuppressAuthor" | "NormalCitation";
};

export type Citation = {
	citationId: string;
	citationPrefix: Array<Inline>;
	citationSuffix: Array<Inline>;
	citationMode: CitationMode;
	citationNoteNum: number;
	citationHash: number;
};

export type ListNumberStyle = {
	t:
		| "DefaultStyle"
		| "Example"
		| "Decimal"
		| "LowerRoman"
		| "UpperRoman"
		| "LowerAlpha"
		| "UpperAlpha";
};

export type ListNumberDelim = {
	t: "DefaultDelim" | "Period" | "OneParen" | "TwoParens";
};

export type ListAttributes = [number, ListNumberStyle, ListNumberDelim];

export type Alignment = {
	t: "AlignLeft" | "AlignRight" | "AlignCenter" | "AlignDefault";
};

export type TableCell = Array<Block>;

export type EltMap = {
	// Inline
	Str: string;
	Emph: Array<Inline>;
	Strong: Array<Inline>;
	Strikeout: Array<Inline>;
	Superscript: Array<Inline>;
	Subscript: Array<Inline>;
	SmallCaps: Array<Inline>;
	Quoted: [QuoteType, Array<Inline>];
	Cite: [Array<Citation>, Array<Inline>];
	Code: [Attr, string];
	Space: undefined;
	SoftBreak: undefined;
	LineBreak: undefined;
	Math: [MathType, string];
	RawInline: [Format, string];
	Link: [Attr, Array<Inline>, Target];
	Image: [Attr, Array<Inline>, Target];
	Note: Array<Block>;
	Span: [Attr, Array<Inline>];

	// Block
	Plain: Array<Inline>;
	Para: Array<Inline>;
	LineBlock: Array<Array<Inline>>;
	CodeBlock: [Attr, string];
	RawBlock: [Format, string];
	BlockQuote: Array<Block>;
	OrderedList: [ListAttributes, Array<Array<Block>>];
	BulletList: Array<Array<Block>>;
	DefinitionList: Array<[Array<Inline>, Array<Array<Block>>]>;
	Header: [number, Attr, Array<Inline>];
	HorizontalRule: undefined;
	Table: [
		Array<Inline>,
		Array<Alignment>,
		Array<number>,
		Array<TableCell>,
		Array<Array<TableCell>>,
	];
	Div: [Attr, Array<Block>];
	Null: undefined;
};
export type EltType = keyof EltMap;

export type Elt<A extends EltType> = { t: A; c: EltMap[A] };

export type AnyElt = Inline | Block;

export type Inline =
	| Elt<"Str">
	| Elt<"Emph">
	| Elt<"Strong">
	| Elt<"Strikeout">
	| Elt<"Superscript">
	| Elt<"Subscript">
	| Elt<"SmallCaps">
	| Elt<"Quoted">
	| Elt<"Cite">
	| Elt<"Code">
	| Elt<"Space">
	| Elt<"SoftBreak">
	| Elt<"LineBreak">
	| Elt<"Math">
	| Elt<"RawInline">
	| Elt<"Link">
	| Elt<"Image">
	| Elt<"Note">
	| Elt<"Span">;

export type Block =
	| Elt<"Plain">
	| Elt<"Para">
	| Elt<"LineBlock">
	| Elt<"CodeBlock">
	| Elt<"RawBlock">
	| Elt<"BlockQuote">
	| Elt<"OrderedList">
	| Elt<"BulletList">
	| Elt<"DefinitionList">
	| Elt<"Header">
	| Elt<"HorizontalRule">
	| Elt<"Table">
	| Elt<"Div">
	| Elt<"Null">;

export type Tree = Array<Block | Inline>;

/** meta information about document, mostly from markdown frontmatter
 * https://hackage.haskell.org/package/pandoc-types-1.20/docs/Text-Pandoc-Definition.html#t:MetaValue
 */
export type PandocMetaValue =
	| { t: "MetaMap"; c: PandocMetaMap }
	| { t: "MetaList"; c: Array<PandocMetaValue> }
	| { t: "MetaBool"; c: boolean }
	| { t: "MetaInlines"; c: Inline[] }
	| { t: "MetaString"; c: string }
	| { t: "MetaBlocks"; c: Block[] };
export type PandocMetaMap = Record<string, PandocMetaValue>;

/**
 * Converts an action into a filter that reads a JSON-formatted pandoc
 * document from stdin, transforms it by walking the tree with the action, and
 * returns a new JSON-formatted pandoc document to stdout. The argument is a
 * function action(key, value, format, meta), where key is the type of the
 * pandoc object (e.g. 'Str', 'Para'), value is the contents of the object
 * (e.g. a string for 'Str', a list of inline elements for 'Para'), format is
 * the target output format (which will be taken for the first command
 * line argument if present), and meta is the document's metadata. If the
 * function returns None, the object to which it applies will remain
 * unchanged. If it returns an object, the object will be replaced. If it
 * returns a list, the list will be spliced in to the list to which the target
 * object belongs. (So, returning an empty list deletes the object.)
 *
 * @param  {Function} action Callback to apply to every object
 */
export function toJSONFilter(action: FilterAction): void {
	require("get-stdin")(function(json: string) {
		var data = JSON.parse(json);
		var format = process.argv.length > 2 ? process.argv[2] : "";
		var output = filter(data, action, format);
		process.stdout.write(JSON.stringify(output));
	});
}

/**
 * Filter the given object
 */
export function filter(data: PandocJson, action: FilterAction, format: Format) {
	return walk(data, action, format, data.meta);
}

function isElt(x: unknown): x is Elt<any> {
	return (typeof x === "object" && x && "t" in x) || false;
}
/**
 * Walk a tree, applying an action to every object.
 * @param  {Object}   x      The object to traverse
 * @param  {Function} action Callback to apply to each item
 * @param  {String}   format Output format
 * @param  {Object}   meta   Pandoc metadata
 * @return {Object}          The modified tree
 */
export function walk(
	x: unknown,
	action: FilterAction,
	format: Format,
	meta: PandocMetaMap,
): unknown {
	if (Array.isArray(x)) {
		var array: unknown[] = [];
		for (const item of x) {
			if (isElt(item)) {
				var res = action(item, format, meta) || item;
				if (Array.isArray(res)) {
					for (const z of res) {
						array.push(walk(z, action, format, meta));
					}
				} else {
					array.push(walk(res, action, format, meta));
				}
			} else {
				array.push(walk(item, action, format, meta));
			}
		}
		return array;
	} else if (typeof x === "object" && x !== null) {
		var obj: any = {};
		for (const k of Object.keys(x)) {
			obj[k] = walk((x as any)[k], action, format, meta);
		}
		return obj;
	}
	return x;
}
export async function walkAsync(
	x: unknown,
	action: FilterActionAsync,
	format: Format,
	meta: PandocMetaMap,
): Promise<unknown> {
	if (Array.isArray(x)) {
		var array: unknown[] = [];
		for (const item of x) {
			if (isElt(item)) {
				var res = (await action(item, format, meta)) || item;
				if (Array.isArray(res)) {
					for (const z of res) {
						array.push(await walkAsync(z, action, format, meta));
					}
				} else {
					array.push(await walkAsync(res, action, format, meta));
				}
			} else {
				array.push(await walkAsync(item, action, format, meta));
			}
		}
		return array;
	} else if (typeof x === "object" && x !== null) {
		var obj: any = {};
		for (const k of Object.keys(x)) {
			obj[k] = await walkAsync((x as any)[k], action, format, meta);
		}
		return obj;
	}
	return x;
}

/**
 * Walks the tree x and returns concatenated string content, leaving out all
 * formatting.
 * @param  {Object} x The object to walk
 * @return {String}   JSON string
 */
export function stringify(x: Tree | AnyElt | { t: "MetaString"; c: string }) {
	if (!Array.isArray(x) && x.t === "MetaString") return x.c;

	var result: string[] = [];
	var go = function(e: AnyElt) {
		if (e.t === "Str") result.push(e.c);
		else if (e.t === "Code") result.push(e.c[1]);
		else if (e.t === "Math") result.push(e.c[1]);
		else if (e.t === "LineBreak") result.push(" ");
		else if (e.t === "Space") result.push(" ");
	};
	walk(x, go, "", {});
	return result.join("");
}

/**
 * Returns an attribute list, constructed from the dictionary attrs.
 * @param  {Object} attrs Attribute dictionary
 * @return {Array}        Attribute list
 */
export function attributes(attrs: { [k: string]: any }): Attr {
	attrs = attrs || {};
	var ident = attrs.id || "";
	var classes = attrs.classes || [];
	var keyvals: [string, string][] = [];
	Object.keys(attrs).forEach(function(k) {
		if (k !== "classes" && k !== "id") keyvals.push([k, attrs[k]]);
	});
	return [ident, classes, keyvals];
}

type WrapArray<T> = T extends undefined ? [] : T extends any[] ? T : [T];

// Utility for creating constructor functions
function elt<T extends EltType>(
	eltType: T,
	numargs: number,
): (...args: WrapArray<EltMap[T]>) => Elt<T> {
	return function(...args: WrapArray<EltMap[T]>) {
		var len = args.length;
		if (len !== numargs)
			throw eltType +
				" expects " +
				numargs +
				" arguments, but given " +
				len;
		return { t: eltType, c: len === 1 ? args[0] : args } as any;
	};
}

export async function filterAsync(
	data: PandocJson,
	action: FilterActionAsync,
	format: Format,
) {
	return await walkAsync(data, action, format, data.meta);
}

export function toJSONFilterAsync(action: FilterActionAsync) {
	require("get-stdin")(function(json: any) {
		var data = JSON.parse(json);
		var format = process.argv.length > 2 ? process.argv[2] : "";
		filterAsync(data, action, format).then(output =>
			process.stdout.write(JSON.stringify(output)),
		);
	});
}

// Constructors for block elements

export const Plain = elt("Plain", 1);
export const Para = elt("Para", 1);
export const CodeBlock = elt("CodeBlock", 2);
export const RawBlock = elt("RawBlock", 2);
export const BlockQuote = elt("BlockQuote", 1);
export const OrderedList = elt("OrderedList", 2);
export const BulletList = elt("BulletList", 1);
export const DefinitionList = elt("DefinitionList", 1);
export const Header = elt("Header", 3);
export const HorizontalRule = elt("HorizontalRule", 0);
export const Table = elt("Table", 5);
export const Div = elt("Div", 2);
export const Null = elt("Null", 0);

// Constructors for inline elements

export const Str = elt("Str", 1);
export const Emph = elt("Emph", 1);
export const Strong = elt("Strong", 1);
export const Strikeout = elt("Strikeout", 1);
export const Superscript = elt("Superscript", 1);
export const Subscript = elt("Subscript", 1);
export const SmallCaps = elt("SmallCaps", 1);
export const Quoted = elt("Quoted", 2);
export const Cite = elt("Cite", 2);
export const Code = elt("Code", 2);
export const Space = elt("Space", 0);
export const LineBreak = elt("LineBreak", 0);
export const Formula = elt("Math", 2); // don't conflict with js builtin Math;
export const RawInline = elt("RawInline", 2);
export const Link = elt("Link", 3);
export const Image = elt("Image", 3);
export const Note = elt("Note", 1);
export const Span = elt("Span", 2);

// a few aliases
export const stdio = toJSONFilter;
export const stdioAsync = toJSONFilterAsync;
