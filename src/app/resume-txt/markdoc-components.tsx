import * as React from "react";

// Helper function to process children and ensure lists use compactList
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
          {hasNextLi && ","}
        </>
      );
    }

    if (child.type === List) {
      return (
        <>
          {processSkillsListChildren((child.props as { children?: React.ReactNode })?.children)}
          {"\n\n"}
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
        }
      );
    }

    return child;
  });
}

const splitChildrenByLines = (
  children: React.ReactNode,
  lineLength: number = 80,
  prefix: string = " - ",
  indent: string = "   "
): string[] => {
  // Helper to extract text from React.ReactNode
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
      lines.push(currentLine + "\n");
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
    lines.push(currentLine + "\n");
  }

  return lines;
};

// Helper function to process nested lists and apply compactList to them
function processNestedLists(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child;
    }

    // If it's a List component, replace with compactList version
    if (child.type === "li") {
      const listProps = child.props as {
        children?: React.ReactNode;
      };
      return splitChildrenByLines(listProps.children);
    }

    // If it's a ul or ol element, add compactList class
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
          children: processNestedLists(childProps.children),
        }
      );
    }

    return child;
  });
}

// Stint component for job/education entries
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

  const formattedTitle = title?.toString().toUpperCase() + "\n";

  return (
    <>
      <>
        <>{formattedTitle}</>
        <>
          {start}
          {start && end && <> – </>}
          {end}
          {"\n"}
        </>
      </>
      <>
        {organization}
        {url && <> ({url})</>}
        {location && <> - {location}</>}
        {"\n"}
      </>
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

// BulletList component - default list styling
// Nested lists use compactList
export const BulletList: React.FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => {
  const processedChildren = processNestedLists(children);
  return <>{processedChildren}</>;
};

// SkillsSection component - grid container for skills lists
export const SkillsSection: React.FunctionComponent<{
  children?: React.ReactNode;
}> = ({ children }) => {
  // Process children to ensure all lists use compactList (same as SkillsList did)
  const processedChildren = processSkillsListChildren(children);
  return <>{processedChildren}</>;
};

// List component - handles regular markdown lists
// Defaults to bulletList, but nested lists use compactList
export const List: React.FunctionComponent<{
  ordered?: boolean;
  children?: React.ReactNode;
}> = ({ children }) => {
  // Process children to apply compactList to nested lists
  const processedChildren = processNestedLists(children);
  return <>{processedChildren}</>;
};

export const Heading: React.FunctionComponent<{
  level: number;
  children?: React.ReactNode;
}> = ({ level, children }) => {
  if (level === 4) {
    return <>{children?.toString().toUpperCase()}: </>;
  }
  if (level === 3) {
    return <>{children?.toString().toUpperCase() + "\n\n"}</>;
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
