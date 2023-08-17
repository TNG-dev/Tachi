import React from "react";
import ReactDOM from "react-dom";
import App from "app/App";
import "styles/main.scss";
import "@fortawesome/fontawesome-free/css/all.min.css";

const { PUBLIC_URL } = process.env;

ReactDOM.render(<App basename={PUBLIC_URL!} />, document.getElementById("root"));
