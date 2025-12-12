import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, Ticket } from "lucide-react";

// Texas Hold'em — Single-file React app
// - Uses Tailwind classes for styling (assumes Tailwind is configured)
// - Uses Framer Motion for tasteful animations
// - Local-only, single-player vs AI table logic for demo and sweepstakes entry
// - Sweepstakes: buy tickets with chips, periodic draw (manual trigger for demo)
// - Exports a default React component ready to paste into a Vite/CRA project

// ---------- Utilities: Deck, shuffle, hand evaluator ----------
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

function makeDeck() {
  const deck = [];
  for (const s of SUITS) for (const r of RANKS) deck.push({ rank: r, suit: s, code: `${r}${s}` });
  return deck;
}

function shuffleDeck(deck) {
  const a = deck.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Convert rank to numeric value for comparisons
function rankValue(rank) {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank, 10);
}

// Evaluate best 5-card hand out of given cards (7-card evaluator)
// Returns {score: number[], name: string, cards: Array}
// Score is an array to compare lexicographically; higher is better.
function evaluateHand(cards) {
  // cards: [{rank, suit, code}]
  if (cards.length < 5) return { score: [0], name: "Incomplete", cards };

  // helper: combinations
  function combinations(arr, k) {
    const res = [];
    function go(start, combo) {
      if (combo.length === k) { res.push(combo.slice()); return; }
      for (let i = start; i < arr.length; i++) { combo.push(arr[i]); go(i + 1, combo); combo.pop(); }
    }
    go(0, []);
    return res;
  }

  const combos = combinations(cards, 5);
  let best = null;

  for (const combo of combos) {
    const score = score5(combo);
    if (!best || compareScore(score.score, best.score) > 0) best = score;
  }
  return best;

  // compare arrays
  function compareScore(a, b) {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const av = a[i] || 0; const bv = b[i] || 0;
      if (av > bv) return 1; if (av < bv) return -1;
    }
    return 0;
  }

  function score5(cards5) {
    const ranks = cards5.map(c => c.rank);
    const suits = cards5.map(c => c.suit);
    const vals = cards5.map(c => rankValue(c.rank)).sort((a,b)=>b-a);
    const counts = {};
    for (const v of vals) counts[v] = (counts[v] || 0) + 1;
    const uniqueVals = Object.keys(counts).map(x=>parseInt(x)).sort((a,b)=>b-a);
    const isFlush = suits.every(s => s === suits[0]);

    // check straight (including wheel A-2-3-4-5)
    let isStraight = false;
    let topStraight = null;
    const setVals = Array.from(new Set(vals)).sort((a,b)=>b-a);
    // check normal straights
    for (let i = 0; i <= setVals.length - 5; i++) {
      let ok = true;
      for (let j = 0; j < 4; j++) if (setVals[i+j] - setVals[i+j+1] !== 1) ok = false;
      if (ok) { isStraight = true; topStraight = setVals[i]; break; }
    }
    // wheel
    const wheel = [14,5,4,3,2];
    if (!isStraight) {
      if (wheel.every(w=>setVals.includes(w))) { isStraight = true; topStraight = 5; }
    }

    // counts analysis
    const countsList = Object.entries(counts).map(([k,v])=>({v: v, val: parseInt(k)})).sort((a,b)=>{if(b.v!==a.v) return b.v-a.v; return b.val-a.val});
    // Determine hand
    // Straight flush
    if (isStraight && isFlush) return { score: [8, topStraight, ...vals], name: "Straight Flush", cards: cards5 };
    // Four of a kind
    if (countsList[0].v === 4) return { score: [7, countsList[0].val, countsList[1].val || 0], name: "Four of a Kind", cards: cards5 };
    // Full house
    if (countsList[0].v === 3 && countsList[1] && countsList[1].v >= 2) return { score: [6, countsList[0].val, countsList[1].val], name: "Full House", cards: cards5 };
    // Flush
    if (isFlush) return { score: [5, ...vals], name: "Flush", cards: cards5 };
    // Straight
    if (isStraight) return { score: [4, topStraight, ...vals], name: "Straight", cards: cards5 };
    // Three of a kind
    if (countsList[0].v === 3) return { score: [3, countsList[0].val, ...uniqueVals.filter(x=>x!==countsList[0].val)], name: "Three of a Kind", cards: cards5 };
    // Two pair
    if (countsList[0].v === 2 && countsList[1] && countsList[1].v === 2) return { score: [2, countsList[0].val, countsList[1].val, countsList[2]?.val||0], name: "Two Pair", cards: cards5 };
    // One pair
    if (countsList[0].v === 2) return { score: [1, countsList[0].val, ...uniqueVals.filter(x=>x!==countsList[0].val)], name: "One Pair", cards: cards5 };
    // High card
    return { score: [0, ...vals], name: "High Card", cards: cards5 };
  }
}

// ---------- Simple AI player logic ----------
function simpleAIAction(state, playerIndex) {
  // state contains community, players etc. We'll do a conservative AI for demo
  const player = state.players[playerIndex];
  if (!player || player.folded) return { action: 'fold' };
  if (state.currentBet > player.bet) {
    // call if small
    const toCall = state.currentBet - player.bet;
    if (toCall <= player.chips * 0.1) return { action: 'call', amount: toCall };
    return { action: 'fold' };
  }
  // If no current bet, sometimes raise
  if (Math.random() < 0.15) {
    const raise = Math.min(player.chips, Math.max(5, Math.floor(player.chips * 0.05)));
    return { action: 'raise', amount: raise };
  }
  return { action: 'check' };
}

// ---------- React Component ----------
export default function TexasSweepApp() {
  // app state
  const [deck, setDeck] = useState(shuffleDeck(makeDeck()));
  const [community, setCommunity] = useState([]);
  const [players, setPlayers] = useState(() => createDemoPlayers());
  const [dealer, setDealer] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState(1); // player 0 is user
  const [pot, setPot] = useState(0);
  const [currentBet, setCurrentBet] = useState(0);
  const [phase, setPhase] = useState('idle'); // idle, preflop, flop, turn, river, showdown
  const [message, setMessage] = useState('Welcome to Texas Sweep — a high-class, modern take on Hold\'em');
  const [tickets, setTickets] = useState(() => parseInt(localStorage.getItem('tickets') || '0', 10));
  const [entries, setEntries] = useState(() => JSON.parse(localStorage.getItem('entries') || '[]'));
  const [drawHistory, setDrawHistory] = useState(() => JSON.parse(localStorage.getItem('drawHistory') || '[]'));

  useEffect(()=>{ localStorage.setItem('tickets', String(tickets)); }, [tickets]);
  useEffect(()=>{ localStorage.setItem('entries', JSON.stringify(entries)); }, [entries]);
  useEffect(()=>{ localStorage.setItem('drawHistory', JSON.stringify(drawHistory)); }, [drawHistory]);

  // start a new hand
  function startHand() {
    const shuffled = shuffleDeck(makeDeck());
    const newPlayers = players.map(p => ({ ...p, hole: [], bet: 0, folded: false }));
    // deal two to each
    let d = shuffled.slice();
    for (let r = 0; r < 2; r++) for (let i = 0; i < newPlayers.length; i++) { newPlayers[i].hole.push(d.shift()); }
    setDeck(d);
    setPlayers(newPlayers);
    setCommunity([]);
    setPot(0);
    setCurrentBet(0);
    setDealer((dealer + 1) % newPlayers.length);
    setCurrentPlayer((dealer + 1) % newPlayers.length); // small blind simplified
    setPhase('preflop');
    setMessage('New hand dealt — preflop premium seating.');
  }

  // progress phases
  function dealFlop() {
    const d = deck.slice();
    d.shift(); // burn
    const flop = [d.shift(), d.shift(), d.shift()];
    setDeck(d);
    setCommunity(prev => [...prev, ...flop]);
    setPhase('flop');
    setMessage('The flop hits the table.');
  }
  function dealTurn() {
    const d = deck.slice(); d.shift(); const t = d.shift(); setDeck(d); setCommunity(prev=>[...prev,t]); setPhase('turn'); setMessage('Turn card revealed.'); }
  function dealRiver() { const d = deck.slice(); d.shift(); const r = d.shift(); setDeck(d); setCommunity(prev=>[...prev,r]); setPhase('river'); setMessage('River — final betting round.'); }

  // player actions
  function playerAction(action, amount=0) {
    // shallow action handling for demo
    const ps = players.slice(); const p = ps[0];
    if (action === 'fold') { p.folded = true; setMessage('You folded.'); }
    if (action === 'check') { setMessage('You checked.'); }
    if (action === 'call') { const toCall = currentBet - p.bet; p.chips -= toCall; p.bet += toCall; setPot(prev=>prev+toCall); setMessage('You called.'); }
    if (action === 'raise') { const toRaise = amount; p.chips -= toRaise; p.bet += toRaise; setCurrentBet(p.bet); setPot(prev=>prev+toRaise); setMessage(`You raised ${toRaise} chips.`); }
    setPlayers(ps);
    // simple AI turns
    setTimeout(()=>{ runAIActions(); }, 500);
  }
  function runAIActions() {
    let ps = players.slice(); let state = { players: ps, community, currentBet };
    for (let i = 1; i < ps.length; i++) {
      if (ps[i].folded) continue;
      const act = simpleAIAction(state, i);
      if (act.action === 'fold') ps[i].folded = true;
      if (act.action === 'call') { const toCall = state.currentBet - ps[i].bet; ps[i].chips -= toCall; ps[i].bet += toCall; setPot(prev=>prev+toCall); }
      if (act.action === 'raise') { const amt = act.amount; ps[i].chips -= amt; ps[i].bet += amt; state.currentBet = ps[i].bet; setCurrentBet(state.currentBet); setPot(prev=>prev+amt); }
      if (act.action === 'check') { /* nothing */ }
    }
    setPlayers(ps);
    // after AI actions, progress phase automatically for demo
    setTimeout(()=>{
      if (phase === 'preflop') dealFlop();
      else if (phase === 'flop') dealTurn();
      else if (phase === 'turn') dealRiver();
      else if (phase === 'river') doShowdown();
    }, 700);
  }

  // showdown
  function doShowdown() {
    const active = players.filter(p => !p.folded);
    const evaluated = active.map(p => ({ player: p, eval: evaluateHand([...p.hole, ...community]) }));
    evaluated.sort((a,b)=>{ // compare scores lexicographically
      const A = a.eval.score; const B = b.eval.score; for (let i=0;i<Math.max(A.length,B.length);i++){ const av=A[i]||0; const bv=B[i]||0; if (av!==bv) return bv-av; } return 0; });
    const winner = evaluated[0];
    const ps = players.slice(); const wIndex = ps.findIndex(x=>x.id===winner.player.id);
    ps[wIndex].chips += pot;
    setPlayers(ps);
    setMessage(`${winner.player.name} wins ${pot} chips with ${winner.eval.name}`);
    setPot(0);
    setPhase('showdown');
  }

  // sweepstakes features
  function buyTickets(num) {
    const costPerTicket = 10; // chips
    const user = players[0];
    const totalCost = costPerTicket * num;
    if (user.chips < totalCost) { setMessage('Not enough chips to buy tickets.'); return; }
    user.chips -= totalCost;
    setPlayers([...players.slice(1)]); // not ideal but we'll persist below
    setPlayers(ps=>{ const arr = players.slice(); arr[0] = user; return arr; });
    setTickets(prev=>prev+num);
    setEntries(prev=>[...prev, ...Array.from({length:num}, ()=>({ id: cryptoRandomId(), owner: 'You', ts: Date.now() }))]);
    setMessage(`Bought ${num} tickets. Good luck in the next draw!`);
  }

  function runSweepstakesDraw() {
    if (entries.length === 0) { setMessage('No entries to draw.'); return; }
    const winnerIdx = Math.floor(Math.random() * entries.length);
    const winner = entries[winnerIdx];
    const prize = Math.max(500, entries.length * 5); // prize in chips
    // If winner is you
    if (winner.owner === 'You') {
      const ps = players.slice(); ps[0].chips += prize; setPlayers(ps);
    }
    const result = { winner, prize, ts: Date.now(), totalEntries: entries.length };
    setDrawHistory(prev=>[result, ...prev].slice(0, 20));
    setEntries([]); setTickets(0);
    setMessage(`Sweepstakes complete. Winner: ${winner.owner} — Prize: ${prize} chips.`);
  }

  // helper: create some demo players
  function createDemoPlayers() {
    return [
      { id: 'p0', name: 'You', chips: 1000, hole: [], bet: 0, folded: false },
      { id: 'p1', name: 'Aurora', chips: 1200, hole: [], bet: 0, folded: false },
      { id: 'p2', name: 'Bennett', chips: 900, hole: [], bet: 0, folded: false },
      { id: 'p3', name: 'Cass', chips: 1100, hole: [], bet: 0, folded: false },
    ];
  }

  // UI small helpers
  function cryptoRandomId() { return Math.random().toString(36).slice(2,9); }

  // derived
  const your = players[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-950 text-gray-100 p-6 flex flex-col items-center">
      <header className="w-full max-w-6xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-indigo-600 to-pink-500 rounded-xl px-4 py-2 shadow-lg flex items-center gap-3">
            <Trophy className="w-6 h-6" />
            <div>
              <div className="text-sm opacity-90">Texas Hold'em</div>
              <div className="text-xs opacity-70">Sweepstakes Edition — Masterclass UI</div>
            </div>
          </div>
          <div className="ml-4 text-sm opacity-80">Dealer: {players[dealer]?.name}</div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-xs opacity-60">Chips</div>
            <div className="text-xl font-semibold">{your?.chips ?? 0}</div>
          </div>
          <div className="text-right">
            <div className="text-xs opacity-60">Tickets</div>
            <div className="text-xl font-semibold">{tickets}</div>
          </div>
          <button onClick={()=>startHand()} className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-md shadow">Deal</button>
        </div>
      </header>

      <main className="w-full max-w-6xl flex gap-6">
        {/* Left: Table */}
        <section className="flex-1 bg-gradient-to-br from-gray-800/40 to-gray-900/40 rounded-2xl p-6 shadow-lg">
          <div className="flex flex-col items-center gap-6">
            <div className="w-full flex justify-center">
              <div className="bg-green-900/40 rounded-xl p-6 flex gap-6 items-center shadow-inner">
                {/* Community cards */}
                <div className="flex gap-3">
                  {community.map((c, i)=> (
                    <motion.div key={i} layout initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="w-20 h-28 bg-white/10 rounded-xl flex items-center justify-center text-2xl font-semibold">
                      <div className={`text-2xl ${c.suit === '♥' || c.suit === '♦' ? 'text-red-400' : 'text-gray-100'}`}>{c.rank}{c.suit}</div>
                    </motion.div>
                  ))}
                </div>
                <div className="ml-6 text-gray-200/80">Pot: <span className="font-semibold">{pot}</span></div>
              </div>
            </div>

            <div className="w-full flex justify-between items-end">
              {/* Opponents */}
              <div className="flex gap-4">
                {players.slice(1).map((p, idx)=>(
                  <div key={p.id} className="w-44 bg-white/5 rounded-xl p-3 flex flex-col items-center">
                    <div className="text-sm opacity-80">{p.name}</div>
                    <div className="text-xs opacity-60">Chips {p.chips}</div>
                    <div className="mt-3 flex gap-2">
                      {p.hole.map((c,i)=>(<div key={i} className="w-12 h-16 bg-white/5 rounded-md flex items-center justify-center">{c ? `${c.rank}${c.suit}` : '??'}</div>))}
                    </div>
                    <div className="text-xs opacity-70 mt-2">{p.folded ? 'Folded' : ''}</div>
                  </div>
                ))}
              </div>

              {/* You */}
              <div className="w-64 bg-white/5 rounded-2xl p-4 flex flex-col items-center">
                <div className="w-full flex justify-between items-center mb-3">
                  <div className="text-sm font-medium">You</div>
                  <div className="text-xs opacity-60">Bet: {your?.bet ?? 0}</div>
                </div>
                <div className="flex gap-3">
                  {(your?.hole || []).map((c,i)=> (
                    <div key={i} className="w-16 h-20 bg-white/10 rounded-md flex items-center justify-center text-xl font-semibold">
                      {c ? `${c.rank}${c.suit}` : '??'}
                    </div>
                  ))}
                </div>
                <div className="mt-4 w-full flex gap-2">
                  <button onClick={()=>playerAction('fold')} className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 rounded-md">Fold</button>
                  <button onClick={()=>playerAction('check')} className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 rounded-md">Check</button>
                  <button onClick={()=>playerAction('call')} className="flex-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md">Call</button>
                </div>
                <div className="mt-3 w-full flex gap-2">
                  <input id="raiseAmt" type="number" defaultValue={50} className="flex-1 bg-white/5 rounded-md px-3 py-2 text-black" />
                  <button onClick={()=>{ const v = Number(document.getElementById('raiseAmt').value||0); playerAction('raise', v); }} className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-md">Raise</button>
                </div>
              </div>
            </div>

            <div className="w-full text-center text-sm opacity-80 mt-4">{message}</div>
          </div>
        </section>

        {/* Right: Sidebar / Sweepstakes */}
        <aside className="w-80 flex-shrink-0 bg-white/5 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5" />
              <div className="text-sm">Sweepstakes</div>
            </div>
            <div className="text-xs opacity-70">Entries: {entries.length}</div>
          </div>
          <div className="text-sm opacity-80">Buy tickets to enter periodic draws. Tickets cost 10 chips each. Wins may award chips or special prizes.</div>
          <div className="flex gap-2">
            <button onClick={()=>buyTickets(1)} className="flex-1 px-3 py-2 bg-indigo-600 rounded-md">Buy 1</button>
            <button onClick={()=>buyTickets(5)} className="flex-1 px-3 py-2 bg-indigo-500 rounded-md">Buy 5</button>
          </div>

          <div className="border-t border-white/5 pt-3">
            <div className="flex items-center justify-between text-xs opacity-80 mb-2">
              <div>Draw History</div>
              <button onClick={()=>runSweepstakesDraw()} className="text-xs px-2 py-1 bg-amber-500 rounded">Run Draw</button>
            </div>
            <div className="space-y-2 max-h-48 overflow-auto">
              {drawHistory.length === 0 ? <div className="text-xs opacity-60">No draws yet.</div> : drawHistory.map((d,i)=>(
                <div key={i} className="text-xs bg-white/3 rounded p-2">{new Date(d.ts).toLocaleString()}: {d.winner.owner} won {d.prize} chips ({d.totalEntries} entries)</div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/5 pt-3">
            <div className="text-xs opacity-70 mb-2">Leaderboard (demo)</div>
            <div className="flex flex-col gap-2">
              {players.slice(0,4).sort((a,b)=>b.chips-a.chips).map(p=> (
                <div key={p.id} className="flex justify-between text-sm"><div>{p.name}</div><div className="font-semibold">{p.chips}</div></div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <footer className="w-full max-w-6xl mt-6 flex justify-between text-xs opacity-70">
        <div>Built with a masterclass UI — Tailwind + Framer Motion. For multiplayer/back-end integration, ask me to wire up WebSockets and server signing.</div>
        <div>© Texas Sweep • Modern, High-Class Design</div>
      </footer>
    </div>
  );
}
