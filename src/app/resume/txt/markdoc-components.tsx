import * as React from "react";

/**
 * Processes React children to format list items for compact display in skills sections.
 * Adds commas between list items and recursively processes nested children.
 *
 * @param children - The React children nodes to process
 * @returns Processed React nodes with commas added between list items
 */
function processSkillsListChildren(children: React.ReactNode): React.ReactNode {
	const childrenArray = React.Children.toArray(children);
	return React.Children.map(children, (child, index) => {
		if (!React.isValidElement(child)) {
			return child;
		}

		// If it's a List component, replace with compactList version
		if (child.type === "li") {
			const listProps = child.props as {
				children?: React.ReactNode;
			};
			// Only add comma if the next child is also an li element
			const nextChild = childrenArray[index + 1];
			const hasNextLi =
				React.isValidElement(nextChild) && nextChild.type === "li";
			return (
				<>
					{listProps.children}
					{hasNextLi && ", "}
				</>
			);
		}

		// Recursively process children if element has children prop
		const childProps = child.props as { children?: React.ReactNode } & Record<
			string,
			unknown
		>;
		if (
			childProps &&
			typeof childProps === "object" &&
			"children" in childProps
		) {
			return React.cloneElement(
				child as React.ReactElement<{ children?: React.ReactNode }>,
				{
					...childProps,
					children: processSkillsListChildren(childProps.children),
				},
			);
		}

		return child;
	});
}

/**
 * Splits React children content into lines with word wrapping for text output.
 * Extracts text from React nodes, normalizes whitespace, and wraps words to fit line length.
 *
 * @param children - The React children nodes to split into lines
 * @param lineLength - Maximum characters per line (default: 80)
 * @param prefix - Prefix string for the first line (default: "- ")
 * @param indent - Indentation string for wrapped lines (default: "  ")
 * @returns Array of strings, each representing a line with newline character
 */
const splitChildrenByLines = (
	children: React.ReactNode,
	lineLength: number = 80,
	prefix: string = "- ",
	indent: string = "  ",
): string[] => {
	/**
	 * Recursively extracts text content from a React node, ignoring element structure.
	 *
	 * @param node - The React node to extract text from
	 * @returns Extracted text content as a string
	 */
	const extractText = (node: React.ReactNode): string => {
		if (typeof node === "string" || typeof node === "number") {
			return String(node);
		}
		if (Array.isArray(node)) {
			return node.map(extractText).join("");
		}
		if (React.isValidElement(node)) {
			const props = node.props as { children?: React.ReactNode };
			return extractText(props.children);
		}
		return "";
	};

	// Extract all text from children
	const text = extractText(children).trim();

	if (!text) {
		return [];
	}

	// Normalize whitespace: replace multiple spaces with single space
	const normalizedText = text.replace(/\s+/g, " ");

	// Split into words
	const words = normalizedText.split(" ").filter((w) => w.length > 0);
	const lines: string[] = [];
	let currentLine = prefix;
	let isFirstLine = true;

	for (const word of words) {
		// Determine if we need a space before the word
		const needsSpace = currentLine.length > 0 && !currentLine.endsWith(" ");
		const separator = needsSpace ? " " : "";
		const testLine = currentLine + separator + word;

		// Check if adding this word would exceed line length
		// Only wrap if we have at least one word on the current line
		const lineHasWords = isFirstLine
			? currentLine.length > prefix.length
			: currentLine.length > indent.length;

		if (testLine.length > lineLength && lineHasWords) {
			// Save current line
			lines.push(`${currentLine}\n`);
			// Start new line with indent
			currentLine = indent + word;
			isFirstLine = false;
		} else {
			// Add word to current line
			currentLine = testLine;
			isFirstLine = false;
		}
	}

	// Add the last line if it has content
	const lineHasWords =
		currentLine.length > prefix.length || currentLine.length > indent.length;
	if (lineHasWords) {
		lines.push(`${currentLine}\n`);
	}

	return lines;
};

/**
 * Processes bullet list children for text output formatting.
 * Splits list items into wrapped lines and processes nested lists recursively.
 *
 * @param children - The React children nodes representing list items
 * @returns Processed React nodes with formatted list content
 */
function processBulletList(children: React.ReactNode): React.ReactNode {
	return React.Children.map(children, (child) => {
		if (!React.isValidElement(child)) {
			return child;
		}

		// If it's an li element, split the children by lines
		if (child.type === "li") {
			const listProps = child.props as {
				children?: React.ReactNode;
			};
			return splitChildrenByLines(listProps.children);
		}

		// If it's a ul or ol element, make children li elements compact
		if (child.type === "ul" || child.type === "ol") {
			const listProps = child.props as React.HTMLAttributes<
				HTMLUListElement | HTMLOListElement
			>;

			return (
				<>
					{"\n"}
					{processSkillsListChildren(listProps.children)}
				</>
			);
		}

		// Recursively process children if element has children prop
		const childProps = child.props as { children?: React.ReactNode } & Record<
			string,
			unknown
		>;
		if (
			childProps &&
			typeof childProps === "object" &&
			"children" in childProps
		) {
			return React.cloneElement(
				child as React.ReactElement<{ children?: React.ReactNode }>,
				{
					...childProps,
					children: processBulletList(childProps.children),
				},
			);
		}

		return child;
	});
}

/**
 * Stint component for rendering job and education entries in text format.
 * Formats the title, dates, organization, location, and optional URL.
 *
 * @param props - Component props
 * @param props.title - The job title or degree name
 * @param props.start - Start date (optional)
 * @param props.end - End date (optional, "Present" for current positions)
 * @param props.location - Location of employment or institution
 * @param props.organization - Company or institution name
 * @param props.url - Optional URL to the organization's website
 * @param props.children - Optional content/description for the stint
 * @param props.pageBreak - Optional flag for page breaks (used by parent)
 * @returns Formatted text representation of the stint
 */
export const Stint: React.FunctionComponent<{
	title: React.ReactNode;
	start?: string;
	end?: string;
	location: string;
	organization: string;
	url?: string;
	children?: React.ReactNode;
	pageBreak?: boolean;
}> = ({
	title,
	start,
	end,
	location,
	organization,
	url,
	children,
	// pageBreak is used by parent section component, not here
}) => {
	// Handle special title formatting for education entries

	const formattedTitle = `${title?.toString().toUpperCase()}\n`;

	return (
		<>
			{formattedTitle}

			{start}
			{start && end && <> – </>}
			{end}
			{"\n"}

			{organization}
			{url && <> ({url})</>}
			{location && <> - {location}</>}
			{"\n"}

			{children ? (
				<>
					{"\n"}
					{children}
					{"\n\n\n"}
				</>
			) : (
				"\n\n"
			)}
		</>
	);
};

/**
 * SkillsSection component that wraps skills lists for text output.
 * Acts as a container that passes through its children without modification.
 *
 * @param props - Component props
 * @param props.children - The skills lists and headings to render
 * @returns The children wrapped in a fragment
 */
export const SkillsSection: React.FunctionComponent<{
	children?: React.ReactNode;
}> = ({ children }) => {
	return <>{children}</>;
};

/**
 * List component that handles markdown lists for text output.
 * Supports both bullet and compact list formatting based on listType prop.
 *
 * @param props - Component props
 * @param props.ordered - Whether the list is ordered (ol) or unordered (ul)
 * @param props.children - The list items to render
 * @param props.listType - Type of list formatting: "bullet" for wrapped lines, "compact" for comma-separated
 * @returns Formatted list content as text
 */
export const List: React.FunctionComponent<{
	ordered?: boolean;
	children?: React.ReactNode;
	listType?: "bullet" | "compact";
}> = ({ children, listType = "bullet" }) => {
	if (listType === "compact") {
		return (
			<>
				{processSkillsListChildren(children)}
				{"\n\n"}
			</>
		);
	}
	return processBulletList(children);
};

/**
 * Heading component that formats markdown headings for text output.
 * Applies different formatting based on heading level:
 * - Level 2: Section headers with dashes
 * - Level 3: Subsection headers with uppercase
 * - Level 4: Category labels with uppercase and colon
 * - Other levels: Standard formatting
 *
 * @param props - Component props
 * @param props.level - The heading level (2-6)
 * @param props.children - The heading text content
 * @returns Formatted heading text with appropriate spacing
 */
export const Heading: React.FunctionComponent<{
	level: number;
	children?: React.ReactNode;
}> = ({ level, children }) => {
	if (level === 4) {
		return <>{children?.toString().toUpperCase()}: </>;
	}
	if (level === 3) {
		return <>{`${children?.toString().toUpperCase()}\n\n`}</>;
	}
	if (level === 2) {
		return (
			<>
				{"\n\n\n"}--- {children?.toString().toUpperCase()} ---{"\n\n\n"}
			</>
		);
	}
	return (
		<>
			{children}
			{"\n\n"}
		</>
	);
};
