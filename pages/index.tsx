import { useState, useEffect } from "react";
import { Footer } from "flowbite-react";
import { BsLinkedin , BsGithub } from "react-icons/bs";
import Card from "@/app/components/VoteCard";
import AdvertCard from "@/app/components/AdvertCard"; // Import AdvertCard
import { voteOptions } from "@/VoteeData"; // Import your scraped data
import Image from "next/image";
import logo from "@/public/Images/thebest.png";
import "@/app/assets/Styles/Card.css";
import "@/app/assets/Styles/Navbar.css";
import "@/app/assets/Styles/background-styles.css";
import "@/app/assets/Styles/Footer.css";

interface VoteResult {
  option: string;
  count: number;
}

type Page = "vote" | "results";

export default function VotingPage() {
  const [results, setResults] = useState<VoteResult[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cooldownMinutes, setCooldownMinutes] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>("vote");

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch("/api/results");
      if (!response.ok) throw new Error("Failed to fetch results");
      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError("Error loading results. Please try again later.");
      console.error("Error fetching results:", err);
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
        await fetchResults();
      } else {
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
      {cooldownMinutes !== null && (
        <p className="message cooldown">
          You can vote again in approximately {cooldownMinutes / 60} hrs.
        </p>
      )}
      <div className="card-grid">
        {voteOptions.map((option, index) => (
          <Card
            key={index}
            imageSrc={`Images/${option.imageSrc}`} // Updated image path
            name={option.name}
            description={option.description}
            youtubeLink={option.youtubeLink}
            facebookLink={option.facebookLink}
            onClick={() => handleVote(option.name)}
          />
        ))}
      </div>
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
          src={logo}
          alt="Logo"
          // layout="responsive"
          width={300}
          height={300}
          priority
        />
        <AdvertCard />
      </div>

      {currentPage === "vote" ? <VoteContent /> : <ResultsContent />}
      <Footer bgDark>
        <div className="w-f">
          <div className="w-sub-1">
            <Footer.Copyright href="#" by="Flowbite™" year={2022} />
            <div className="w-sub-2">
              <Footer.Icon href="#" icon={BsGithub} />
              <Footer.Icon href="#" icon={BsLinkedin} />
            </div>
          </div>
        </div>
      </Footer>
    </div>
  );
}
