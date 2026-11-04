import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  Filter, 
  Search, 
  Calendar, 
  ExternalLink, 
  Trash2, 
  Edit3, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Award, 
  Target, 
  Activity, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  MinusCircle, 
  Download, 
  Upload, 
  X,
  Sparkles,
  BookOpen
} from 'lucide-react';

// Default initial data for immediate analytics preview
const DEFAULT_TRADES = [
  
];

const SETUPS_LIST = [
  'Supply Zone Short',
  'Anish Live Trade',
  'H1 Order Block',
  'M15 Rejection',
  'Breakout Re-test',
  'Unknown Setup',
  'Trend Continuation'
];

export default function App() {
  const [trades, setTrades] = useState(() => {
    const saved = localStorage.getItem('trading_journal_trades');
    return saved ? JSON.parse(saved) : DEFAULT_TRADES;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [activeTab, setActiveTab] = useState('journal'); // 'journal' | 'analytics'
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPair, setFilterPair] = useState('All');
  const [filterSetup, setFilterSetup] = useState('All');
  const [filterOutcome, setFilterOutcome] = useState('All');

  // New/Edit Trade Form state
  const [formData, setFormData] = useState({
    date: new Date().toISOString().slice(0, 16),
    pair: 'XAU/USD',
    direction: 'Buy',
    session: 'New York',
    setup: 'Supply Zone Short',
    entry: '',
    sl: '',
    tp: '',
    outcome: 'TP Hit',
    chartUrl: '',
    notes: ''
  });

  // Save trades to LocalStorage
  useEffect(() => {
    localStorage.setItem('trading_journal_trades', JSON.stringify(trades));
  }, [trades]);

  // Calculate R:R automatically when entry, SL, TP change
  const calculatedRR = useMemo(() => {
    const entry = parseFloat(formData.entry);
    const sl = parseFloat(formData.sl);
    const tp = parseFloat(formData.tp);

    if (!entry || !sl || !tp || entry === sl) return { rrString: '0:0', rVal: 0 };

    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    const ratio = (reward / risk).toFixed(1);

    return { rrString: `1:${ratio}`, rVal: parseFloat(ratio) };
  }, [formData.entry, formData.sl, formData.tp]);

  // Submit Trade
  const handleSubmit = (e) => {
    e.preventDefault();
    
    let rMult = 0;
    if (formData.outcome === 'TP Hit') {
      rMult = calculatedRR.rVal || 1;
    } else if (formData.outcome === 'SL Hit') {
      rMult = -1.0;
    } else {
      rMult = 0.0;
    }

    const newTrade = {
      id: selectedTrade ? selectedTrade.id : Date.now().toString(),
      ...formData,
      entry: parseFloat(formData.entry) || 0,
      sl: parseFloat(formData.sl) || 0,
      tp: parseFloat(formData.tp) || 0,
      rr: calculatedRR.rrString,
      rMultiple: rMult,
      pnlAmount: rMult
    };

    if (selectedTrade) {
      setTrades(trades.map(t => t.id === selectedTrade.id ? newTrade : t));
    } else {
      setTrades([newTrade, ...trades]);
    }

    resetForm();
    setIsModalOpen(false);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().slice(0, 16),
      pair: 'XAU/USD',
      direction: 'Buy',
      session: 'New York',
      setup: 'Supply Zone Short',
      entry: '',
      sl: '',
      tp: '',
      outcome: 'TP Hit',
      chartUrl: '',
      notes: ''
    });
    setSelectedTrade(null);
  };

  const handleEdit = (trade) => {
    setSelectedTrade(trade);
    setFormData({
      date: trade.date,
      pair: trade.pair,
      direction: trade.direction,
      session: trade.session,
      setup: trade.setup,
      entry: trade.entry,
      sl: trade.sl,
      tp: trade.tp,
      outcome: trade.outcome,
      chartUrl: trade.chartUrl || '',
      notes: trade.notes || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this trade entry?')) {
      setTrades(trades.filter(t => t.id !== id));
    }
  };

  // Filtered trades
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      const matchesSearch = t.notes.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.setup.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            t.pair.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPair = filterPair === 'All' || t.pair === filterPair;
      const matchesSetup = filterSetup === 'All' || t.setup === filterSetup;
      const matchesOutcome = filterOutcome === 'All' || t.outcome === filterOutcome;

      return matchesSearch && matchesPair && matchesSetup && matchesOutcome;
    });
  }, [trades, searchQuery, filterPair, filterSetup, filterOutcome]);

  // Overall Stats Calculation
  const stats = useMemo(() => {
    const total = trades.length;
    if (total === 0) return { total: 0, winRate: 0, tpCount: 0, slCount: 0, beCount: 0, netR: 0, bestSetup: 'N/A', profitFactor: 0 };

    let tpCount = 0;
    let slCount = 0;
    let beCount = 0;
    let netR = 0;
    let grossWinR = 0;
    let grossLossR = 0;

    const setupStats = {};

    trades.forEach(t => {
      netR += t.rMultiple || 0;
      if (t.outcome === 'TP Hit') {
        tpCount++;
        grossWinR += (t.rMultiple || 0);
      } else if (t.outcome === 'SL Hit') {
        slCount++;
        grossLossR += 1.0;
      } else {
        beCount++;
      }

      // Track by setup
      if (!setupStats[t.setup]) {
        setupStats[t.setup] = { total: 0, wins: 0 };
      }
      setupStats[t.setup].total++;
      if (t.outcome === 'TP Hit') setupStats[t.setup].wins++;
    });

    const winRate = ((tpCount / total) * 100).toFixed(1);
    const profitFactor = grossLossR > 0 ? (grossWinR / grossLossR).toFixed(2) : grossWinR.toFixed(2);

    // Find Best Setup
    let bestSetupName = 'N/A';
    let maxWR = -1;

    Object.keys(setupStats).forEach(s => {
      const st = setupStats[s];
      if (st.total >= 2) { // minimum 2 trades
        const wr = (st.wins / st.total) * 100;
        if (wr > maxWR) {
          maxWR = wr;
          bestSetupName = `${s} (${wr.toFixed(0)}%)`;
        }
      }
    });

    return {
      total,
      winRate,
      tpCount,
      slCount,
      beCount,
      netR: netR.toFixed(1),
      bestSetup: bestSetupName,
      profitFactor
    };
  }, [trades]);

  // Analytics Breakdown Data
  const setupBreakdown = useMemo(() => {
    const map = {};
    trades.forEach(t => {
      if (!map[t.setup]) map[t.setup] = { total: 0, wins: 0, losses: 0, totalR: 0 };
      map[t.setup].total++;
      if (t.outcome === 'TP Hit') map[t.setup].wins++;
      if (t.outcome === 'SL Hit') map[t.setup].losses++;
      map[t.setup].totalR += t.rMultiple || 0;
    });

    return Object.keys(map).map(setup => {
      const item = map[setup];
      const wr = item.total > 0 ? ((item.wins / item.total) * 100).toFixed(0) : 0;
      return { setup, ...item, winRate: Number(wr) };
    }).sort((a, b) => b.winRate - a.winRate);
  }, [trades]);

  const sessionBreakdown = useMemo(() => {
    const sessions = { 'Asian': { total: 0, wins: 0 }, 'London': { total: 0, wins: 0 }, 'New York': { total: 0, wins: 0 } };
    trades.forEach(t => {
      if (sessions[t.session]) {
        sessions[t.session].total++;
        if (t.outcome === 'TP Hit') sessions[t.session].wins++;
      }
    });
    return Object.keys(sessions).map(s => {
      const total = sessions[s].total;
      const wins = sessions[s].wins;
      const wr = total > 0 ? ((wins / total) * 100).toFixed(0) : 0;
      return { session: s, total, wins, winRate: Number(wr) };
    });
  }, [trades]);

  // Export Data JSON
  const exportData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trades, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `trading_journal_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import Data JSON
  const importData = (e) => {
    const fileReader = new FileReader();
    fileReader.readAsText(e.target.files[0], "UTF-8");
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (Array.isArray(parsed)) {
          setTrades(parsed);
          alert('Trades imported successfully!');
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-2 rounded-xl text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                TradeCraft Pro
              </h1>
              <p className="text-xs text-slate-400">XAU/USD & USTEC Discipline Journal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold px-4 py-2 rounded-lg text-sm transition-all shadow-lg shadow-emerald-950/40 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log Trade</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('journal')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'journal' 
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Trade Log ({trades.length})
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'analytics' 
                  ? 'bg-slate-800 text-emerald-400 border border-slate-700 shadow-sm' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Strategy Analytics
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button onClick={exportData} className="flex items-center gap-1 hover:text-slate-200 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <label className="flex items-center gap-1 hover:text-slate-200 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-md cursor-pointer">
              <Upload className="w-3.5 h-3.5" /> Import
              <input type="file" accept=".json" onChange={importData} className="hidden" />
            </label>
          </div>
        </div>

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Win Rate */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Win Rate</span>
              <Target className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-slate-100">{stats.winRate}%</div>
            <div className="text-xs text-slate-500 mt-1">{stats.tpCount} Wins / {stats.total} Total</div>
          </div>

          {/* Net R PnL */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Net Performance</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-bold ${Number(stats.netR) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {Number(stats.netR) >= 0 ? `+${stats.netR} R` : `${stats.netR} R`}
            </div>
            <div className="text-xs text-slate-500 mt-1">Profit Factor: {stats.profitFactor}</div>
          </div>

          {/* TP Count */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>TP Hits</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats.tpCount}</div>
            <div className="text-xs text-slate-500 mt-1">Full target reached</div>
          </div>

          {/* SL Count */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>SL Hits</span>
              <XCircle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-bold text-rose-400">{stats.slCount}</div>
            <div className="text-xs text-slate-500 mt-1">Risk managed</div>
          </div>

          {/* BE Count */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Break-Even</span>
              <MinusCircle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{stats.beCount}</div>
            <div className="text-xs text-slate-500 mt-1">Zero loss exits</div>
          </div>

          {/* Top Setup */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
              <span>Best Setup</span>
              <Award className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-sm font-bold text-slate-200 truncate mt-1" title={stats.bestSetup}>
              {stats.bestSetup}
            </div>
            <div className="text-xs text-slate-500 mt-1">Highest win %</div>
          </div>
        </div>

        {/* MAIN JOURNAL TAB */}
        {activeTab === 'journal' && (
          <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search notes, setups..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <span className="text-xs text-slate-400 font-medium">Pair:</span>
                  <select
                    value={filterPair}
                    onChange={(e) => setFilterPair(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="All">All Pairs</option>
                    <option value="XAU/USD">XAU/USD (Gold)</option>
                    <option value="USTEC">USTEC (NASDAQ)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Setup:</span>
                  <select
                    value={filterSetup}
                    onChange={(e) => setFilterSetup(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none max-w-[140px]"
                  >
                    <option value="All">All Setups</option>
                    {SETUPS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Result:</span>
                  <select
                    value={filterOutcome}
                    onChange={(e) => setFilterOutcome(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  >
                    <option value="All">All Outcomes</option>
                    <option value="TP Hit">TP Hit</option>
                    <option value="SL Hit">SL Hit</option>
                    <option value="Break-Even">Break-Even</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Trades Table */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Date / Session</th>
                      <th className="py-3.5 px-4">Pair & Type</th>
                      <th className="py-3.5 px-4">Setup Tag</th>
                      <th className="py-3.5 px-4">Entry / SL / TP</th>
                      <th className="py-3.5 px-4">Planned R:R</th>
                      <th className="py-3.5 px-4">Outcome</th>
                      <th className="py-3.5 px-4">Chart / Notes</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-sm">
                    {filteredTrades.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="py-12 text-center text-slate-500">
                          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          No trades found matching your search filters.
                        </td>
                      </tr>
                    ) : (
                      filteredTrades.map((t) => (
                        <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                          {/* Date & Session */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="font-medium text-slate-200">
                              {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                              {t.session} Session
                            </div>
                          </td>

                          {/* Pair & Direction */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-100">{t.pair}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                t.direction === 'Buy' 
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50' 
                                  : 'bg-rose-950/60 text-rose-400 border-rose-800/50'
                              }`}>
                                {t.direction}
                              </span>
                            </div>
                          </td>

                          {/* Setup */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-md">
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              {t.setup}
                            </span>
                          </td>

                          {/* Execution Levels */}
                          <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-300 font-mono">
                            <div>E: <span className="text-slate-100 font-semibold">{t.entry}</span></div>
                            <div className="text-slate-500">SL: {t.sl} | TP: {t.tp}</div>
                          </td>

                          {/* R:R */}
                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs">
                            <span className="text-teal-400 font-semibold">{t.rr}</span>
                          </td>

                          {/* Outcome Badge */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {t.outcome === 'TP Hit' && (
                              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="w-3.5 h-3.5" /> TP Hit ({t.rMultiple >= 0 ? `+${t.rMultiple}R` : `${t.rMultiple}R`})
                              </span>
                            )}
                            {t.outcome === 'SL Hit' && (
                              <span className="inline-flex items-center gap-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                                <XCircle className="w-3.5 h-3.5" /> SL Hit (-1.0R)
                              </span>
                            )}
                            {t.outcome === 'Break-Even' && (
                              <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                                <MinusCircle className="w-3.5 h-3.5" /> BE (0.0R)
                              </span>
                            )}
                          </td>

                          {/* Chart & Notes */}
                          <td className="py-3.5 px-4">
                            <div className="max-w-xs truncate text-xs text-slate-400" title={t.notes}>
                              {t.notes || 'No notes added'}
                            </div>
                            {t.chartUrl && (
                              <a
                                href={t.chartUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 mt-1"
                              >
                                View Chart <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(t)}
                                className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 transition-colors"
                                title="Edit Trade"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="p-1.5 hover:bg-rose-950/50 rounded-md text-slate-400 hover:text-rose-400 transition-colors"
                                title="Delete Trade"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Setup Performance Breakdown */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Target className="w-5 h-5 text-emerald-400" /> Setup Win Rate Breakdown
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Which strategy produces the highest probability?</p>
                </div>
              </div>

              <div className="space-y-4">
                {setupBreakdown.length === 0 ? (
                  <p className="text-sm text-slate-500">No data available yet.</p>
                ) : (
                  setupBreakdown.map((item) => (
                    <div key={item.setup} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-200">{item.setup}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">{item.wins}W / {item.total} Trades</span>
                          <span className="font-bold text-emerald-400">{item.winRate}%</span>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${item.winRate}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Session Breakdown */}
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-400" /> Trading Session Win Rate
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Performance mapped to market timing</p>
                </div>
              </div>

              <div className="space-y-5">
                {sessionBreakdown.map((s) => (
                  <div key={s.session} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-slate-200">{s.session} Session</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.wins} Wins out of {s.total} trades</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-emerald-400">{s.winRate}%</div>
                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">Win Rate</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* LOG / EDIT TRADE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden my-8">
            
            {/* Modal Header */}
            <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-950/40">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                {selectedTrade ? 'Edit Trade Entry' : 'Log New Manual Trade'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              
              {/* Pair & Direction */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Asset Pair</label>
                  <select
                    value={formData.pair}
                    onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="XAU/USD">XAU/USD (Gold)</option>
                    <option value="USTEC">USTEC (NASDAQ)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Direction</label>
                  <select
                    value={formData.direction}
                    onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Buy">Buy (Long)</option>
                    <option value="Sell">Sell (Short)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Session</label>
                  <select
                    value={formData.session}
                    onChange={(e) => setFormData({ ...formData, session: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Asian">Asian</option>
                    <option value="London">London</option>
                    <option value="New York">New York</option>
                  </select>
                </div>
              </div>

              {/* Date & Strategy Setup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Strategy / Setup Tag</label>
                  <select
                    value={formData.setup}
                    onChange={(e) => setFormData({ ...formData, setup: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    {SETUPS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Price Levels (Entry, SL, TP) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Entry Price</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 4028.5"
                    value={formData.entry}
                    onChange={(e) => setFormData({ ...formData, entry: e.target.value })}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Stop Loss (SL)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 4033.0"
                    value={formData.sl}
                    onChange={(e) => setFormData({ ...formData, sl: e.target.value })}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Take Profit (TP)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 4005.0"
                    value={formData.tp}
                    onChange={(e) => setFormData({ ...formData, tp: e.target.value })}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Outcome Selection */}
              <div className="flex items-center justify-between bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <span className="block text-xs font-semibold text-slate-400">Calculated R:R Ratio</span>
                  <span className="text-lg font-bold text-teal-400 font-mono">{calculatedRR.rrString}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-400 mr-2">Outcome:</span>
                  {['TP Hit', 'SL Hit', 'Break-Even'].map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setFormData({ ...formData, outcome: o })}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                        formData.outcome === o
                          ? o === 'TP Hit' 
                            ? 'bg-emerald-500 text-slate-950 border-emerald-400' 
                            : o === 'SL Hit'
                            ? 'bg-rose-500 text-slate-950 border-rose-400'
                            : 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              {/* TradingView Chart URL */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">TradingView Chart Link (Optional)</label>
                <input
                  type="url"
                  placeholder="https://www.tradingview.com/x/..."
                  value={formData.chartUrl}
                  onChange={(e) => setFormData({ ...formData, chartUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Notes / Lessons */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Trade Notes & Confirmation Reasons</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Waited for H1 Supply zone rejection candle, risk was managed at 1%..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                ></textarea>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-5 py-2 rounded-lg text-sm transition-all"
                >
                  {selectedTrade ? 'Update Trade' : 'Save Trade'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}