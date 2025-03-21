import styles from "./index.module.scss";
import Logo from "./components/Logo";
import Link from "next/link";

export default function Home() {
  return (
    <div className={styles.splash}>
      <div className={styles.splashInner}>
        <Logo className={styles.logo} />
        <nav>
          <ul>
            <li>
              <Link href="/resume">Resumé</Link>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
