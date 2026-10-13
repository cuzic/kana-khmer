import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { course } from "./course";
import "./style.css";

document.title = course.title[course.from] ?? course.id;
document.documentElement.lang = course.from;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
