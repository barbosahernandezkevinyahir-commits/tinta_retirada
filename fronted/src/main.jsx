import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { CarritoProvider } from "./context/CarritoContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
    <CarritoProvider>
        <App />
    </CarritoProvider>
);