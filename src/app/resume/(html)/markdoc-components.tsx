import * as React from "react";
import styles from "./resume.module.scss";

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
	const formattedTitle =
		typeof title === "string" && title.includes(" in ") ? (
			<>
				{title.split(" in ")[0]} in{" "}
				<span style={{ whiteSpace: "nowrap" }}>{title.split(" in ")[1]}</span>
			</>
		) : (
			title
		);

	const hasChildren = React.Children.count(children) > 0;
	const stintClassName = hasChildren
		? styles.stint
		: `${styles.stint} ${styles.noChildren}`.trim();

	const content = (
		<div className={stintClassName}>
			<div className={styles.topLine}>
				<h3 className={styles.jobTitle}>{formattedTitle}</h3>
				<div style={{ whiteSpace: "nowrap" }} className={styles.dates}>
					{start}
					{start && end && <> – </>}
					{end}
				</div>
			</div>
			<div className={styles.organization}>
				{url ? (
					<a href={url} target="_blank">
						{organization}
					</a>
				) : (
					organization
				)}
			</div>
			<div className={styles.location}>{location}</div>
			{children}
		</div>
	);

	// Return content as-is - the parent section component will wrap in li
	return content;
};

// SkillsSection component - grid container for skills lists
export const SkillsSection: React.FunctionComponent<{
	children?: React.ReactNode;
}> = ({ children }) => {
	return <div className={styles.skillsSection}>{children}</div>;
};

// List component - handles regular markdown lists
// Uses compactList if within a skillsSection, otherwise uses bulletList
export const List: React.FunctionComponent<{
	ordered?: boolean;
	listType?: "bullet" | "compact";
	children?: React.ReactNode;
	parentTags?: string;
}> = ({ children, listType = "bullet", ordered = false }) => {
	const Component = ordered ? "ol" : "ul";

	// Use compactList if within skillsSection, otherwise use bulletList
	const className =
		listType === "compact" ? styles.compactList : styles.bulletList;

	return <Component className={className}>{children}</Component>;
};
