"use client";

import { useSpellCheck } from "@/hooks/useSpellCheck";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function DialectToggle() {
  const { dialect, setDialect } = useSpellCheck();

  return (
    <Tabs
      value={dialect}
      onValueChange={(value) => setDialect(value as "us" | "uk" | "both")}
      className="w-full max-w-md mx-auto"
    >
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="us">US English</TabsTrigger>
        <TabsTrigger value="both">Both</TabsTrigger>
        <TabsTrigger value="uk">UK English</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
