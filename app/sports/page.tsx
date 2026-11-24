import type { Metadata } from "next";
import SportsPage from "@/components/SportsPage";

export const metadata: Metadata = {
  title: "Sportsbook · Bet Kenya 254",
  description: "Demo Kenyan and international sports markets with simulated odds and settlement.",
};

export default function SportsRoute() {
  return <SportsPage />;
}
