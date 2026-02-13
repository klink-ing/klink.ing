import type { ReactNode } from "react";
import MainMenu from "../../components/MainMenu";
import styles from "./resume.module.scss";

const ResumePage = ({ children }: { children: ReactNode }) => (
	<div className={styles.resumePage}>
		<MainMenu />
		{children}
	</div>
);

export default ResumePage;
