import "../styles/footer.css";
import { Link } from "react-router-dom";

function Footer() {
    return (
        <footer className="site-footer">
            <div className="footer-brand">
                <h2>Tinta Retirada</h2>
                <p>Moda urbana premium con estilo auténtico y envíos rápidos.</p>
            </div>
            <div className="footer-links">
                <div>
                    <h3>Enlaces</h3>
                    <Link to="/catalogo">Catálogo</Link>
                    <Link to="/carrito">Carrito</Link>
                    <Link to="/favoritos">Favoritos</Link>
                </div>
                <div>
                    <h3>Contacto</h3>
                    <a href="mailto:contacto@tintaretirada.com">contacto@tintaretirada.com</a>
                    <a href="tel:+34123456789">+34 123 456 789</a>
                </div>
                <div>
                    <h3>Redes sociales</h3>
                    <a href="https://www.instagram.com" target="_blank" rel="noreferrer">Instagram</a>
                    <a href="https://www.facebook.com" target="_blank" rel="noreferrer">Facebook</a>
                    <a href="https://www.tiktok.com" target="_blank" rel="noreferrer">TikTok</a>
                </div>
            </div>
        </footer>
    );
}

export default Footer;
