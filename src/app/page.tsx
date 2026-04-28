import Link from "next/link";
import Logo from "./components/Logo";
import styles from "@/styles/splash.module.css";

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
