import { useState, useEffect } from "react";
// import { Footer } from "flowbite-react";
// import { BsLinkedin , BsGithub } from "react-icons/bs";
import Card from "@/app/components/VoteCard";
import AdvertCard from "@/app/components/AdvertCard"; // Import AdvertCard
import { voteOptions } from "@/VoteeData"; // Import your scraped data
import Image from "next/image";
// import logo from "@/public/Images/thebest.png";
import "@/app/assets/Styles/Card.css";
import "@/app/assets/Styles/Navbar.css";
import "@/app/assets/Styles/background-styles.css";
import "@/app/assets/Styles/Footer.css";

interface VoteResult {
  option: string;
  count: number;
}

type Page = "vote" | "results";
const CACHE_KEY = "votingData";
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes in milliseconds

export default function VotingPage() {
  const [results, setResults] = useState<VoteResult[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>("vote");
  const [hasVoted, setHasVoted] = useState(false); // Track if user has voted
  // const [isCheckingVote, setIsCheckingVote] = useState(true); // Track if we are checking vote status

  useEffect(() => {
    fetchVotingData();
  }, []);

  const fetchVotingData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Check for cached data
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        if (Date.now() - timestamp < CACHE_TTL) {
          setResults(data.results);
          setHasVoted(data.hasVoted);
          setIsLoading(false);
          return;
        }
      }

      // Fetch new data if cache is invalid or doesn't exist
      const response = await fetch("/api/voting-data");
      if (!response.ok) throw new Error("Failed to fetch voting data");
      const data = await response.json();
      setResults(data.results);
      setHasVoted(data.hasVoted);

      // Update cache
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );
    } catch (err) {
      setError("Error loading voting data. Please try again later.");
      console.error("Error fetching voting data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (optionName: string) => {
    try {
      setMessage("");
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option: optionName }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setCooldownMinutes(null);
        setResults(data.updatedResults);
        setHasVoted(true);

        // Update local cache
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const parsedData = JSON.parse(cachedData);
          parsedData.data.results = data.updatedResults;
          parsedData.data.hasVoted = true;
          localStorage.setItem(CACHE_KEY, JSON.stringify(parsedData));
        }
      } else {
        setHasVoted(true);
        setMessage(data.message);
        if (data.cooldownRemaining) {
          setCooldownMinutes(data.cooldownRemaining);
        }
      }
    } catch (error) {
      setMessage("Error casting vote. Please try again.");
      console.error("Voting error:", error);
    }
  };

  const ResultsContent = () => {
    const sortedResults = [...results].sort((a, b) => b.count - a.count);
    const maxVotes = Math.max(...sortedResults.map((r) => r.count), 1); // Ensure maxVotes is at least 1

    return (
      <div className="results-section">
        {/* <h2>Voting Results</h2> */}
        {isLoading ? (
          <p>Loading results...</p>
        ) : error ? (
          <p className="message error">{error}</p>
        ) : (
          <div className="results-grid">
            {sortedResults.map((result) => (
              <div key={result.option} className="result-card">
                <div className="result-header">
                  <span>{result.option}</span>
                  <span>{result.count}</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${(result.count / maxVotes) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            ))}
            <p className="total-votes">
              Total votes:{" "}
              {sortedResults.reduce((sum, result) => sum + result.count, 0)}
            </p>
          </div>
        )}
      </div>
    );
  };

  const VoteContent = () => (
    <>
      {message && (
        <p
          className={`message ${
            cooldownMinutes !== null ? "cooldown" : "error"
          }`}
        >
          {message}
        </p>
      )}
      {isLoading ? (
        <p>Checking your voting status...</p> // Indicate that we are checking
      ) : hasVoted ? (
        <p className="thanks-message">You have already voted. Thanks for participating! 🎉</p>
      ) : (
        <div className="card-grid">
          {voteOptions.map((option, index) => (
            <Card
              key={index}
              imageSrc={`https://raw.githubusercontent.com/Madiocre/vote-images/main/${option.imageSrc}`}
              name={option.name}
              description={option.description}
              youtubeLink={option.youtubeLink}
              facebookLink={option.facebookLink}
              onClick={() => handleVote(option.name)}
            />
          ))}
        </div>
      )}
    </>
  );

  useEffect(() => {
    const updateLineRotations = () => {
      const lines = document.querySelectorAll(".background-line");
      lines.forEach((line) => {
        // Assert that the line is an HTMLElement
        const htmlLine = line as HTMLElement;
        const startRotation = Math.random() * 360;
        const endRotation = startRotation + Math.random() * 180 - 90; // Random rotation ±90 degrees
        htmlLine.style.setProperty("--start-rotation", `${startRotation}deg`);
        htmlLine.style.setProperty("--end-rotation", `${endRotation}deg`);
      });
    };

    // Initial rotation update
    updateLineRotations();

    // Set up an interval to update rotations
    const intervalId = setInterval(updateLineRotations, 15000); // Update every 15 seconds

    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="container">
      <div className="background-container">
        {[...Array(20)].map((_, index) => (
          <div
            key={index}
            className={`background-line background-line-${index + 1}`}
          />
        ))}
      </div>

      <nav className="navbar">
        <button
          className={`nav-link ${currentPage === "vote" ? "active" : ""}`}
          onClick={() => setCurrentPage("vote")}
        >
          Vote
        </button>
        <button
          className={`nav-link ${currentPage === "results" ? "active" : ""}`}
          onClick={() => setCurrentPage("results")}
        >
          Results
        </button>
      </nav>

      {/* <h1 className="heading">Anonymous Voting System</h1> */}
      <div className="logo-container">
        <Image
          className="logo"
          src="https://raw.githubusercontent.com/Madiocre/vote-images/main/thebest.png"
          alt="Logo"
          // layout="responsive"
          width={300}
          height={300}
          priority
        />
        <AdvertCard />
      </div>

      {currentPage === "vote" ? <VoteContent /> : <ResultsContent />}
      <footer>
        <div className="footer-bottom">
          <div className="footer-bottom-social-icons">
            <ul id="footer-social-links">
              <li>
                <a href="https://github.com/Madiocre" target="_blank">
                  GitHub
                </a>
              </li>{" "}
              |
              <li>
                <a href="https://www.linkedin.com/in/ahmed-shalaby-31a03a235/" target="_blank">
                  LinkedIn
                </a>
              </li>
            </ul>
            <div className="footer-bottom-site-credit">
              Powered By:{" "}
              <span id="site-credit">
                <a href="https://github.com/Madiocre" target="_blank">
                  Madiocre (Ahmed Shalaby)
                </a>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
