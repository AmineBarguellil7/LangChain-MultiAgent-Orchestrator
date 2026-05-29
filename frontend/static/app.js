const form = document.querySelector("#research-form");
const topicInput = document.querySelector("#topic");
const topicCounter = document.querySelector("#topic-counter");
const runButton = document.querySelector("#run-button");
const statusLine = document.querySelector("#status-line");

const outputNodes = {
    report: document.querySelector("#report-output"),
    feedback: document.querySelector("#feedback-output"),
    search: document.querySelector("#search-output"),
    scrape: document.querySelector("#scrape-output"),
};

const summaryNodes = {
    topic: document.querySelector("#summary-topic"),
    report: document.querySelector("#summary-report"),
    sources: document.querySelector("#summary-sources"),
    score: document.querySelector("#summary-score"),
};

function setStatus(message, type = "") {
    statusLine.textContent = message;
    statusLine.className = `status-line ${type}`.trim();
}

function setRunning(isRunning) {
    runButton.disabled = isRunning;
    runButton.classList.toggle("is-running", isRunning);
    topicInput.disabled = isRunning;
    document.body.dataset.state = isRunning ? "running" : document.body.dataset.state || "idle";
}

function setOutput(node, value, fallback) {
    const text = value || fallback;
    node.textContent = text;
    node.classList.toggle("empty", !value);
}

function countUrls(text) {
    const matches = text.match(/https?:\/\/[^\s)]+/g);
    return matches ? new Set(matches).size : 0;
}

function extractScore(feedback) {
    const match = feedback.match(/Score:\s*([0-9.]+\s*\/\s*10)/i);
    return match ? match[1].replace(/\s+/g, "") : "Reviewed";
}

function animateValue(el, start, end, suffix = "") {
    const isNumeric = typeof end === "number";
    if (!isNumeric) { el.textContent = end; return; }
    const duration = 800;
    const startTime = performance.now();
    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + (end - start) * eased);
        el.textContent = `${current.toLocaleString()}${suffix}`;
        if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}

function updateSummary(data) {
    const reportLength = (data.report || "").length;
    const sourceCount = countUrls(data.search_results || "");

    summaryNodes.topic.textContent = data.topic || "Untitled";

    const prevReport = parseInt(summaryNodes.report.textContent.replace(/[,\s]/g, "")) || 0;
    const prevSources = parseInt(summaryNodes.sources.textContent) || 0;
    animateValue(summaryNodes.report, prevReport, reportLength, " chars");
    animateValue(summaryNodes.sources, prevSources, sourceCount, ` URL${sourceCount === 1 ? "" : "s"}`);

    summaryNodes.score.textContent = data.feedback ? extractScore(data.feedback) : "Pending";
}

function updateTopicCounter() {
    topicCounter.textContent = `${topicInput.value.length} / ${topicInput.maxLength}`;
}

async function runResearch(topic) {
    const response = await fetch("/research", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic }),
    });

    const payload = await response.json();

    if (!response.ok) {
        const detail = payload.detail || "Research pipeline failed.";
        throw new Error(Array.isArray(detail) ? detail[0].msg : detail);
    }

    return payload;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const topic = topicInput.value.trim();
    if (!topic) {
        setStatus("Enter a research topic.", "error");
        return;
    }

    setRunning(true);
    setStatus("Pipeline running. Search, scraping, writing, and critique can take a little while.");

    try {
        const data = await runResearch(topic);

        setOutput(outputNodes.report, data.report, "No report returned.");
        setOutput(outputNodes.feedback, data.feedback, "No critic feedback returned.");
        setOutput(outputNodes.search, data.search_results, "No search results returned.");
        setOutput(outputNodes.scrape, data.scraped_content_preview, "No scraped preview returned.");
        updateSummary(data);
        document.body.dataset.state = "complete";
        setStatus("Pipeline complete.", "success");
    } catch (error) {
        document.body.dataset.state = "error";
        setStatus(error.message, "error");
    } finally {
        setRunning(false);
    }
});

topicInput.addEventListener("input", updateTopicCounter);
updateTopicCounter();

document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-target]");
    if (!button) {
        return;
    }

    const target = document.querySelector(`#${button.dataset.copyTarget}`);
    if (!target || target.classList.contains("empty")) {
        return;
    }

    await navigator.clipboard.writeText(target.textContent);

    const originalLabel = button.textContent;
    button.classList.add("copied");
    button.textContent = "Copied";
    window.setTimeout(() => {
        button.classList.remove("copied");
        button.textContent = originalLabel;
    }, 1200);
});

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.08,
    rootMargin: "0px 0px -40px 0px",
});

document.querySelectorAll(".fade-in-up").forEach((el) => observer.observe(el));
