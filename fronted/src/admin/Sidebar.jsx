import "../styles/admin.css";

function Sidebar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
                <div className="brand-badge">TR</div>
                <div className="brand-text">
                    <h2>Tinta Retirada</h2>
                    <p>Panel administrativo</p>
                </div>
            </div>

            <nav className="sidebar-nav">
                <span className="sidebar-link is-active">🏠 Dashboard</span>
            </nav>
        </aside>
    );
}

export default Sidebar;