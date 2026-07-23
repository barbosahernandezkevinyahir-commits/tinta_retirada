import "../styles/banner.css";
import { Link } from "react-router-dom";

function Banner(){

    return(

        <section className="banner">

            <h1>Tinta Retirada</h1>

            <h3>Moda urbana con personalidad</h3>

            <Link to="/catalogo">
                <button>Comprar Ahora</button>
            </Link>

        </section>

    );

}

export default Banner;