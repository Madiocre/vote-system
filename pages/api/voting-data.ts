import { NextApiRequest, NextApiResponse } from "next";
import db from "../../utils/mongodb";
import { voteOptions } from "../../VoteeData";
import { SessionToken, VoteCount } from "../../types/database";

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes in milliseconds
let cachedResults: VoteCount[] | null = null;
let lastCacheTime: number = 0;

const sessionsCollection = db.collection<SessionToken>("sessions");
const resultsCollection = db.collection<VoteCount>("results");

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const token = req.cookies.voteToken;

  try {
    // Check if cache is valid
    const currentTime = Date.now();
    if (cachedResults && currentTime - lastCacheTime < CACHE_TTL) {
      const hasVoted = await checkIfVoted(token);
      res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
      return res.status(200).json({ results: cachedResults, hasVoted });
    }

    const results = await fetchResults();
    cachedResults = results;
    lastCacheTime = currentTime;

    const hasVoted = await checkIfVoted(token);

    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate');
    return res.status(200).json({ results, hasVoted });
  } catch (error) {
    console.error("Error fetching voting data:", error);
    return res.status(500).json({ message: "Error fetching voting data" });
  }
}

async function fetchResults(): Promise<VoteCount[]> {
  const results = await resultsCollection.find({}).toArray();

  // Create a map of all possible options initialized to zero
  const resultsMap = new Map(voteOptions.map((option) => [option.name, 0]));

  // Update counts from actual results
  results.forEach((result) => {
    if (resultsMap.has(result.option)) {
      resultsMap.set(result.option, result.count);
    }
  });

  // Convert map back to array format
  return Array.from(resultsMap, ([option, count]) => ({ option, count }));
}

async function checkIfVoted(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const session = await sessionsCollection.findOne({ token, expiresAt: { $gt: new Date() } });
  return !!session;
}