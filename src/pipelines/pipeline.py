import re

from src.agents.agents import (
    build_search_agent,
    writer_chain,
    critic_chain
)

from src.tools.tools import scrape_url


def run_research_pipeline(topic: str) -> dict:

    state = {}

    # ============================================
    # STEP 1 - SEARCH
    # ============================================

    print("\n" + "=" * 50)
    print("step 1 - search agent is working ...")
    print("=" * 50)

    search_agent = build_search_agent()

    search_result = search_agent.invoke({
        "messages": [
            ("user", f"Find recent, reliable and detailed information about: {topic}")
        ]
    })

    # Extract REAL tool output
    tool_outputs = []

    for msg in search_result["messages"]:

        if msg.__class__.__name__ == "ToolMessage":
            tool_outputs.append(msg.content)

    state["search_results"] = "\n\n".join(tool_outputs)

    print("\nSearch Results:\n")
    print(state["search_results"][:3000])

    # ============================================
    # STEP 2 - SCRAPE TOP RESOURCE
    # ============================================

    print("\n" + "=" * 50)
    print("step 2 - scraping top resource ...")
    print("=" * 50)

    # Extract URLs from search results
    urls = re.findall(r'https?://\S+', state["search_results"])

    # Cleanup URLs
    urls = [url.strip(".,)\n") for url in urls]

    # Domains that commonly block scraping
    blocked_domains = [
        "axios.com",
        "nytimes.com",
        "bloomberg.com",
        "wsj.com"
    ]

    state["scraped_content"] = "Could not scrape any usable URL."

    if not urls:

        state["scraped_content"] = "No URL found in search results."

    else:

        for url in urls:

            # Skip blocked domains
            if any(domain in url for domain in blocked_domains):

                print(f"\nSkipping blocked domain: {url}")
                continue

            print(f"\nTrying URL: {url}")

            try:

                scraped = scrape_url.invoke({
                    "url": url
                })

                # Detect failed scraping responses
                blocked_errors = [
                    "403",
                    "Forbidden",
                    "timed out",
                    "Could not scrape",
                    "HTTP error",
                    "404",
                    "Access Denied"
                ]

                if any(err.lower() in scraped.lower() for err in blocked_errors):

                    print("Blocked or failed. Trying next URL...")
                    continue

                # SUCCESS
                state["scraped_content"] = scraped

                print("\nSuccessfully scraped content.")
                break

            except Exception as e:

                print(f"\nFailed scraping URL: {str(e)}")
                continue

    print("\nScraped Content:\n")
    print(state["scraped_content"][:2000])

    # ============================================
    # STEP 3 - WRITER
    # ============================================

    print("\n" + "=" * 50)
    print("step 3 - Writer is drafting the report ...")
    print("=" * 50)

    research_combined = (
        f"SEARCH RESULTS:\n{state['search_results']}\n\n"
        f"DETAILED SCRAPED CONTENT:\n{state['scraped_content']}"
    )

    state["report"] = writer_chain.invoke({
        "topic": topic,
        "research": research_combined
    })

    print("\nFinal Report:\n")
    print(state["report"])

    # ============================================
    # STEP 4 - CRITIC
    # ============================================

    print("\n" + "=" * 50)
    print("step 4 - critic is reviewing the report")
    print("=" * 50)

    state["feedback"] = critic_chain.invoke({
        "report": state["report"]
    })

    print("\nCritic Report:\n")
    print(state["feedback"])

    return state