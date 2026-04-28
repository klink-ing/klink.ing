import Link from "next/link";
import Logo from "./Logo";
import styles from "./MainMenu.module.scss";

const MainMenu = () => (
  <nav className={styles.menu}>
    <Link className={styles.logo} href="/">
      <Logo />
    </Link>
    <Link href="/resume">Resumé</Link>
  </nav>
);

export default MainMenu;
