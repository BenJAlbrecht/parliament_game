import { Outlet } from 'react-router-dom';
import useGameStore from '$lib/store.js';

export default function Layout() {
  const headerFlag   = useGameStore((s) => s.headerFlag);
  const headerAccent = useGameStore((s) => s.headerAccent);

  const ruleColor = headerAccent ?? '#334155';

  return (
    <div className="container">
      <header className="masthead">
        <div className="masthead-inner">
          <img className="header-flag" src={`/images/party_flags/${headerFlag}.svg`} alt="" />
          <h1>Parliament</h1>
          <img className="header-flag" src={`/images/party_flags/${headerFlag}.svg`} alt="" />
        </div>
        <div className="masthead-rule" style={{ background: ruleColor }}></div>
        <div className="masthead-rule masthead-rule--thin"></div>
      </header>
      <Outlet />
    </div>
  );
}
