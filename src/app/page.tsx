import styles from "./index.module.scss";
import Logo from "./components/Logo";

export default function Home() {
  return (
    <div className={styles.splash}>
      <div className={styles.splashInner}>
        <Logo className={styles.logo} />
        <nav>
          <ul>
            <li>
              <a href="/resume">Resumé</a>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}
