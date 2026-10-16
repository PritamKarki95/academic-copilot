// DEMO MODE sample data. Only used when the app is switched to Demo mode —
// never as a fallback for a failed real request.

import { isoDaysFromToday } from "./dates";
import type { AgentResult, UploadResult } from "./types";

export const DEMO_FILE_NAMES = ["CS201_Syllabus_Fall2026.pdf", "Lecture_07-09_Hashing_Trees_Heaps.pdf"];

const COURSE = "CS 201 · Data Structures";

export function demoUploadResult(): UploadResult {
  // Dates are relative to today so "days remaining" always looks right on stage.
  return {
    sessionId: "demo-session",
    events: [
      { id: "e1", course: COURSE, title: "Problem Set 3: Hash Tables", type: "assignment", dueDate: isoDaysFromToday(4), weight: "5%", sourceFile: DEMO_FILE_NAMES[0] },
      { id: "e2", course: COURSE, title: "Midterm Exam", type: "exam", dueDate: isoDaysFromToday(9), weight: "25%", sourceFile: DEMO_FILE_NAMES[0] },
      { id: "e3", course: COURSE, title: "Lab 4: Binary Search Trees", type: "assignment", dueDate: isoDaysFromToday(13), weight: "4%", sourceFile: DEMO_FILE_NAMES[0] },
      { id: "e4", course: COURSE, title: "Project Milestone 2", type: "project", dueDate: isoDaysFromToday(20), weight: "10%", sourceFile: DEMO_FILE_NAMES[0] },
      { id: "e5", course: COURSE, title: "Final Exam", type: "exam", dueDate: isoDaysFromToday(52), weight: "35%", sourceFile: DEMO_FILE_NAMES[0] },
    ],
  };
}

export const DEMO_AGENT_RESULT: AgentResult = {
  studyGuide: {
    title: "Midterm Exam Study Guide",
    course: COURSE,
    focus: "Midterm Exam",
    summary:
      "Your midterm covers weeks 1–7. Based on the lecture notes, most weight sits on hashing, binary search trees, and heaps — with Big-O analysis threaded through every topic. Spend the most time on comparing operation costs across structures.",
    sections: [
      {
        heading: "Big-O & Complexity Analysis",
        points: [
          "Know best, average, and worst case for search, insert, and delete on every structure covered.",
          "Be ready to explain why an unbalanced BST degrades to O(n).",
          "Practice reading a loop and stating its time complexity.",
        ],
      },
      {
        heading: "Hash Tables",
        points: [
          "Average O(1) lookup depends on a good hash function and a low load factor.",
          "Compare separate chaining with open addressing (linear probing).",
          "Understand when and why a table resizes, and what rehashing costs.",
        ],
      },
      {
        heading: "Binary Search Trees",
        points: [
          "In-order traversal visits keys in sorted order.",
          "Trace insert and delete by hand, including deleting a node with two children.",
          "Height determines cost: O(log n) when balanced, O(n) when skewed.",
        ],
      },
      {
        heading: "Heaps & Priority Queues",
        points: [
          "A binary heap supports insert and extract-min in O(log n).",
          "Know the array layout: children of index i sit at 2i+1 and 2i+2.",
          "Building a heap from an array takes O(n), not O(n log n).",
        ],
      },
    ],
    keyTerms: [
      { term: "Load factor", definition: "Number of stored entries divided by the number of buckets." },
      { term: "Collision", definition: "Two different keys hashing to the same bucket." },
      { term: "Heap property", definition: "Every parent is ≤ its children (min-heap) or ≥ them (max-heap)." },
      { term: "Balanced tree", definition: "A tree whose height stays O(log n) as it grows." },
    ],
  },
  quiz: {
    title: "Midterm Practice Quiz",
    questions: [
      {
        id: "q1",
        question: "What is the average-case time to look up a key in a hash table with a good hash function?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        correctIndex: 0,
        explanation: "With keys spread evenly and a bounded load factor, each bucket holds a constant number of items on average.",
      },
      {
        id: "q2",
        question: "What is the worst-case search time in an unbalanced binary search tree with n nodes?",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        correctIndex: 2,
        explanation: "If keys are inserted in sorted order, the tree becomes a linked list of height n, so search may visit every node.",
      },
      {
        id: "q3",
        question: "Which data structure is the usual choice for implementing an efficient priority queue?",
        options: ["Stack", "Binary heap", "Singly linked list", "Hash table"],
        correctIndex: 1,
        explanation: "A binary heap gives O(log n) insert and extract-min while keeping the highest-priority item at the root.",
      },
      {
        id: "q4",
        question: "An in-order traversal of a binary search tree visits the keys in what order?",
        options: ["Insertion order", "Reverse insertion order", "Sorted ascending order", "Level by level"],
        correctIndex: 2,
        explanation: "In-order visits left subtree, node, then right subtree — and the BST property makes that ascending order.",
      },
      {
        id: "q5",
        question: "Which collision strategy stores every key that hashes to a bucket in a list at that bucket?",
        options: ["Linear probing", "Separate chaining", "Double hashing", "Quadratic probing"],
        correctIndex: 1,
        explanation: "Separate chaining keeps a list per bucket; the probing methods instead search for another open slot in the table.",
      },
    ],
  },
};
