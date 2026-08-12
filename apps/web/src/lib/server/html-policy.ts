import { parse } from 'parse5';
import { getMaxHtmlBytes } from './config';

type HtmlAttribute = { name: string; value: string };
type HtmlNode = {
	nodeName: string;
	tagName?: string;
	attrs?: HtmlAttribute[];
	childNodes?: HtmlNode[];
};

const forbiddenElements = new Set([
	'applet',
	'base',
	'embed',
	'form',
	'frame',
	'frameset',
	'iframe',
	'link',
	'object',
	'script'
]);
const urlAttributes = new Set([
	'action',
	'formaction',
	'href',
	'poster',
	'src',
	'xlink:href'
]);

export type HtmlValidation = { ok: true } | { ok: false; errors: string[] };

export function validateHtml(html: string): HtmlValidation {
	const errors = new Set<string>();
	const size = Buffer.byteLength(html, 'utf8');
	if (!html.trim()) errors.add('The HTML file is empty.');
	if (size > getMaxHtmlBytes()) {
		errors.add(`The HTML file is larger than ${getMaxHtmlBytes()} bytes.`);
	}

	const document = parse(html) as HtmlNode;
	walk(document, errors);
	return errors.size ? { ok: false, errors: [...errors] } : { ok: true };
}

function walk(node: HtmlNode, errors: Set<string>): void {
	const tag = node.tagName?.toLowerCase();
	if (tag && forbiddenElements.has(tag)) errors.add(`<${tag}> is not allowed.`);

	for (const attribute of node.attrs ?? []) {
		const name = attribute.name.toLowerCase();
		const value = attribute.value.trim().toLowerCase();
		if (name.startsWith('on'))
			errors.add(`Event handler attributes such as ${name} are not allowed.`);
		if (name === 'srcdoc') errors.add('srcdoc is not allowed.');
		if (name === 'style' && /(?:url\s*\(|@import)/i.test(attribute.value)) {
			errors.add('CSS network URLs and imports are not allowed.');
		}
		if (urlAttributes.has(name) && /^(?:javascript|vbscript):/.test(value)) {
			errors.add(`Unsafe URL in ${name} is not allowed.`);
		}
	}

	if (tag === 'meta') {
		const httpEquiv = node.attrs?.find(
			(attribute) => attribute.name.toLowerCase() === 'http-equiv'
		);
		if (httpEquiv?.value.toLowerCase() === 'refresh')
			errors.add('Meta refresh is not allowed.');
	}

	if (tag === 'style') {
		const text = (node.childNodes ?? [])
			.map((child) => ('value' in child ? String(child.value) : ''))
			.join('');
		if (/(?:url\s*\(|@import)/i.test(text))
			errors.add('CSS network URLs and imports are not allowed.');
	}

	for (const child of node.childNodes ?? []) walk(child, errors);
}

export const draftContentSecurityPolicy = [
	"default-src 'none'",
	"script-src 'none'",
	"style-src 'unsafe-inline'",
	'img-src https: data:',
	'font-src data:',
	'media-src https: data:',
	"connect-src 'none'",
	"object-src 'none'",
	"base-uri 'none'",
	"form-action 'none'"
].join('; ');
