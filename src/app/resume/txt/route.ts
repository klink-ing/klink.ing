import Markdoc from "@markdoc/markdoc";
import * as React from "react";
import {
	createConfigWithFrontmatter,
	getResumeAstAndFrontmatter,
} from "../utils";
import { Heading, List, SkillsSection, Stint } from "./markdoc-components";
import { config } from "./markdoc-config";

const components = {
	Stint,
	SkillsSection,
	List,
	Heading,
};

/**
 * Extracts text content from a React node by executing components.
 * Uses iterative approach with explicit stack to avoid call-stack overflow.
 * Accumulates text in an array (mutable buffer) for efficient concatenation.
 * Handles React elements, fragments, strings, numbers, and arrays.
 */
function extractTextFromReactNode(node: React.ReactNode): string {
	const buffer: string[] = [];
	const stack: React.ReactNode[] = [node];

	while (stack.length > 0) {
		const current = stack.pop();

		// Handle primitives
		if (typeof current === "string") {
			buffer.push(current);
			continue;
		}
		if (typeof current === "number") {
			buffer.push(String(current));
			continue;
		}
		if (
			current === null ||
			current === undefined ||
			typeof current === "boolean"
		) {
			continue;
		}

		// Handle arrays - push items in reverse order to maintain order
		if (Array.isArray(current)) {
			for (let i = current.length - 1; i >= 0; i--) {
				stack.push(current[i]);
			}
			continue;
		}

		// Handle React elements
		if (React.isValidElement(current)) {
			const element = current as React.ReactElement;

			// If the element type is a function (component), execute it
			if (typeof element.type === "function") {
				// Cast to function component type since our components are all functional
				const Component = element.type as (props: unknown) => React.ReactNode;
				const componentResult = Component(element.props);
				stack.push(componentResult);
				continue;
			}

			// Otherwise, extract children from props
			const props = element.props as { children?: React.ReactNode };
			if (props.children) {
				stack.push(props.children);
			}
		}
	}

	return buffer.join("");
}

export async function GET() {
	// 1. Parse and transform Markdoc
	const { ast, frontmatter } = getResumeAstAndFrontmatter(false);
	const configWithFrontmatter = createConfigWithFrontmatter(
		config,
		frontmatter,
	);
	const transformed = Markdoc.transform(ast, configWithFrontmatter);

	// 2. Render with React
	const rendered = Markdoc.renderers.react(transformed, React, { components });

	// 3. Generate header from frontmatter
	const header = `${frontmatter.name}\n${frontmatter.github}\n${frontmatter.email}\n`;

	// 4. Extract text from React elements
	const body = extractTextFromReactNode(rendered);

	// 5. Return as plain text with suggested filename
	return new Response(header + body, {
		headers: {
			"Content-Type": "text/plain; charset=UTF-8",
			"Content-Disposition": 'attachment; filename="chris-klink-resume.txt"',
		},
	});
}
