import { useState, useEffect, useRef } from 'react'
import './App.css'

interface ScoreEntry {
  id: string
  player: string
  score: number
}

const API_BASE_URL = 'http://localhost:5012'
const GAME_DURATION = 10 // 10秒間

export default function App() {
  // ポートフォリオ＆ゲーム状態
  const [gameState, setGameState] = useState<'idle' | 'countdown' | 'playing' | 'finished'>('idle')
  const [countdown, setCountdown] = useState<number>(3)
  const [timeLeft, setTimeLeft] = useState<number>(GAME_DURATION)
  const [score, setScore] = useState<number>(0)
  const [clickEffects, setClickEffects] = useState<{ id: number; x: number; y: number }[]>([])

  // スコア送信状態
  const [playerName, setPlayerName] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submitSuccess, setSubmitSuccess] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // ランキング状態
  const [rankings, setRankings] = useState<ScoreEntry[]>([])
  const [isLoadingRankings, setIsLoadingRankings] = useState<boolean>(false)
  const [rankingsError, setRankingsError] = useState<string | null>(null)

  const clickButtonRef = useRef<HTMLButtonElement>(null)

  // ランキング取得処理
  const fetchRankings = async () => {
    setIsLoadingRankings(true)
    setRankingsError(null)
    try {
      const res = await fetch(`${API_BASE_URL}/api/scores`, {
        headers: { 'Accept': 'application/json' }
      })
      if (!res.ok) {
        throw new Error(`HTTP エラー: ${res.status} ${res.statusText}`)
      }
      const data: ScoreEntry[] = await res.json()
      setRankings(data)
    } catch (err: unknown) {
      console.error('Failed to fetch rankings:', err)
      setRankingsError(
        err instanceof Error ? err.message : 'バックエンドAPIとの通信に失敗しました。'
      )
    } finally {
      setIsLoadingRankings(false)
    }
  }

  // 初期ロード時にランキング取得
  useEffect(() => {
    fetchRankings()
  }, [])

  // カウントダウンタイマー
  useEffect(() => {
    if (gameState !== 'countdown') return

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else {
      // カウントダウン完了 -> ゲームスタート
      setGameState('playing')
      setTimeLeft(GAME_DURATION)
      setScore(0)
    }
  }, [gameState, countdown])

  // ゲームプレイタイマー
  useEffect(() => {
    if (gameState !== 'playing') return

    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            setGameState('finished')
            return 0
          }
          return prev - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setGameState('finished')
    }
  }, [gameState, timeLeft])

  // ゲーム開始
  const handleStartGame = () => {
    setScore(0)
    setCountdown(3)
    setGameState('countdown')
    setSubmitSuccess(false)
    setSubmitError(null)
  }

  // クリック処理 & エフェクト
  const handleClickTarget = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (gameState !== 'playing') return

    setScore((prev) => prev + 1)

    // クリック位置にエフェクトを追加
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const newEffect = { id: Date.now() + Math.random(), x, y }

    setClickEffects((prev) => [...prev.slice(-10), newEffect])
    setTimeout(() => {
      setClickEffects((prev) => prev.filter((item) => item.id !== newEffect.id))
    }, 600)
  }

  // スコア送信処理
  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = playerName.trim()
    if (!trimmed) {
      setSubmitError('プレイヤー名を入力してください。')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          player: trimmed,
          score: score
        })
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        throw new Error(errorData?.error || `送信に失敗しました (Status: ${res.status})`)
      }

      setSubmitSuccess(true)
      setPlayerName('')
      // 保存完了後にランキングを自動更新
      await fetchRankings()
    } catch (err: unknown) {
      console.error('Failed to submit score:', err)
      setSubmitError(
        err instanceof Error ? err.message : 'スコアの保存中にエラーが発生しました。'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // CPS（秒間クリック数）
  const cps = gameState === 'playing' && GAME_DURATION - timeLeft > 0
    ? (score / (GAME_DURATION - timeLeft)).toFixed(1)
    : (score / GAME_DURATION).toFixed(1)

  return (
    <div className="portfolio-app">
      {/* ナビゲーションヘッダー */}
      <header className="site-header">
        <div className="header-inner">
          <div className="logo-group">
            <span className="logo-badge">DEV</span>
            <span className="logo-text">PORTFOLIO & LAB</span>
          </div>
          <nav className="header-nav">
            <a href="#about">About</a>
            <a href="#skills">Tech Stack</a>
            <a href="#game" className="nav-highlight">Mini Game</a>
            <a href="#rankings">Leaderboard</a>
          </nav>
        </div>
      </header>

      {/* ヒーローセクション（エンジニアポートフォリオ） */}
      <section id="about" className="hero-section">
        <div className="hero-badge">
          <span className="pulse-dot"></span> Cloud & Fullstack Engineer Portfolio
        </div>
        <h1 className="hero-title">
          Building Scalable Clouds & <br />
          <span className="text-gradient">Interactive Web Systems</span>
        </h1>
        <p className="hero-subtitle">
          ASP.NET Core と React、そして Google Cloud Firestore を連携させたフルスタック・リアルタイムアプリケーション。
          以下で動作するミニゲームのスコアは、実際にバックエンドAPI経由でクラウドデータベース（Firestore）へ記録されます。
        </p>

        {/* スキルタグ */}
        <div id="skills" className="tech-tags">
          <span className="tag tag-csharp">.NET 8 / C#</span>
          <span className="tag tag-react">React 19</span>
          <span className="tag tag-ts">TypeScript</span>
          <span className="tag tag-gcp">Google Cloud Firestore</span>
          <span className="tag tag-vite">Vite</span>
          <span className="tag tag-rest">REST API</span>
        </div>
      </section>

      {/* メイングリッド: ミニゲーム & ランキング */}
      <main className="dashboard-grid">
        {/* ミニゲームセクション */}
        <section id="game" className="card game-card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="section-icon">⚡</span>
              <div>
                <h2>Speed Clicker Challenge</h2>
                <p className="card-desc">10秒間で何回連打できるか挑戦しよう！スコアはFirestoreに即時反映されます。</p>
              </div>
            </div>
            <div className="api-endpoint-badge">
              <code>POST /api/score</code>
            </div>
          </div>

          <div className="game-screen">
            {gameState === 'idle' && (
              <div className="game-idle-view">
                <div className="game-mascot">🎯</div>
                <h3>10-Second Speed Tap</h3>
                <p>ボタンを全力連打してハイスコアを目指しましょう！</p>
                <button
                  id="btn-start-game"
                  className="btn btn-primary btn-large"
                  onClick={handleStartGame}
                >
                  ゲームスタート
                </button>
              </div>
            )}

            {gameState === 'countdown' && (
              <div className="game-countdown-view">
                <div className="countdown-number">{countdown > 0 ? countdown : 'START!'}</div>
                <p className="countdown-label">準備してください...</p>
              </div>
            )}

            {gameState === 'playing' && (
              <div className="game-playing-view">
                <div className="game-stats-bar">
                  <div className="stat-box">
                    <span className="stat-label">残り時間</span>
                    <span className={`stat-value ${timeLeft <= 3 ? 'text-danger' : ''}`}>
                      {timeLeft}s
                    </span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">スコア</span>
                    <span className="stat-value text-accent">{score}</span>
                  </div>
                  <div className="stat-box">
                    <span className="stat-label">CPS (打/秒)</span>
                    <span className="stat-value text-highlight">{cps}</span>
                  </div>
                </div>

                {/* プログレスバー */}
                <div className="time-bar-wrapper">
                  <div
                    className="time-bar-fill"
                    style={{ width: `${(timeLeft / GAME_DURATION) * 100}%` }}
                  ></div>
                </div>

                {/* 連打ターゲットボタン */}
                <div className="target-button-container">
                  <button
                    id="btn-click-target"
                    ref={clickButtonRef}
                    className="target-button"
                    onClick={handleClickTarget}
                  >
                    <span className="target-button-glow"></span>
                    <span className="target-button-text">CLICK!</span>
                    {clickEffects.map((eff) => (
                      <span
                        key={eff.id}
                        className="click-floating-number"
                        style={{ left: `${eff.x}px`, top: `${eff.y}px` }}
                      >
                        +1
                      </span>
                    ))}
                  </button>
                </div>
              </div>
            )}

            {gameState === 'finished' && (
              <div className="game-finished-view">
                <div className="result-badge">GAME FINISHED!</div>
                <div className="final-score-display">
                  <span className="final-score-label">記録スコア</span>
                  <span className="final-score-number">{score}</span>
                  <span className="final-score-unit">Clicks / 10s (Avg: {cps} CPS)</span>
                </div>

                {/* スコア送信フォーム */}
                {!submitSuccess ? (
                  <form className="score-form" onSubmit={handleSubmitScore}>
                    <label htmlFor="player-name-input" className="form-label">
                      ランキングに登録するプレイヤー名:
                    </label>
                    <div className="form-row">
                      <input
                        id="player-name-input"
                        type="text"
                        className="input-text"
                        placeholder="例: CloudNinja, Alice"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        maxLength={20}
                        disabled={isSubmitting}
                      />
                      <button
                        id="btn-save-score"
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting || !playerName.trim()}
                      >
                        {isSubmitting ? (
                          <span className="btn-loading">
                            <span className="spinner-inline"></span> 送信中...
                          </span>
                        ) : (
                          'スコアを保存'
                        )}
                      </button>
                    </div>

                    {submitError && (
                      <div className="alert-box alert-error">
                        ⚠️ {submitError}
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="alert-box alert-success">
                    🎉 スコアが正常にFirestoreへ保存されました！
                  </div>
                )}

                <div className="finished-actions">
                  <button
                    id="btn-play-again"
                    type="button"
                    className="btn btn-secondary"
                    onClick={handleStartGame}
                  >
                    もう一度挑戦する
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ランキング表示セクション */}
        <section id="rankings" className="card ranking-card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="section-icon">🏆</span>
              <div>
                <h2>Firestore Leaderboard</h2>
                <p className="card-desc">リアルタイム上位5名のハイスコア一覧</p>
              </div>
            </div>
            <div className="header-actions">
              <div className="api-endpoint-badge">
                <code>GET /api/scores</code>
              </div>
              <button
                id="btn-refresh-rankings"
                className="btn-icon"
                title="ランキングを再取得"
                onClick={fetchRankings}
                disabled={isLoadingRankings}
              >
                🔄
              </button>
            </div>
          </div>

          <div className="ranking-content">
            {isLoadingRankings && (
              <div className="ranking-status loading-state">
                <div className="spinner"></div>
                <p>Firestoreからスコアを取得中...</p>
              </div>
            )}

            {!isLoadingRankings && rankingsError && (
              <div className="ranking-status error-state">
                <div className="error-icon">⚠️</div>
                <p className="error-message">スコアの取得に失敗しました</p>
                <code className="error-detail">{rankingsError}</code>
                <p className="error-hint">
                  バックエンド (<code>{API_BASE_URL}</code>) が起動していることを確認してください。
                </p>
                <button
                  id="btn-retry-rankings"
                  className="btn btn-secondary btn-small"
                  onClick={fetchRankings}
                >
                  再試行
                </button>
              </div>
            )}

            {!isLoadingRankings && !rankingsError && rankings.length === 0 && (
              <div className="ranking-status empty-state">
                <div className="empty-icon">🎮</div>
                <p>まだスコアが登録されていません。</p>
                <p className="empty-sub">最初のチャレンジャーになってスコアを刻みましょう！</p>
              </div>
            )}

            {!isLoadingRankings && !rankingsError && rankings.length > 0 && (
              <div className="table-wrapper">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th className="col-rank">順位</th>
                      <th className="col-player">プレイヤー</th>
                      <th className="col-score">スコア</th>
                      <th className="col-id">Doc ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankings.map((entry, index) => {
                      const rankBadge =
                        index === 0
                          ? '🥇 1st'
                          : index === 1
                          ? '🥈 2nd'
                          : index === 2
                          ? '🥉 3rd'
                          : `${index + 1}th`

                      return (
                        <tr
                          key={entry.id || index}
                          className={`rank-row ${index < 3 ? `top-rank-${index + 1}` : ''}`}
                        >
                          <td className="col-rank">
                            <span className="rank-badge">{rankBadge}</span>
                          </td>
                          <td className="col-player">
                            <span className="player-name">{entry.player || 'Anonymous'}</span>
                          </td>
                          <td className="col-score">
                            <span className="score-number">{entry.score.toLocaleString()}</span>
                            <span className="score-unit">pts</span>
                          </td>
                          <td className="col-id">
                            <span className="doc-id-pill" title={entry.id}>
                              {entry.id ? `${entry.id.substring(0, 8)}...` : '-'}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="ranking-footer">
            <span className="db-info">
              ⚡ Database: Google Cloud Firestore (<code>game_scores</code> collection)
            </span>
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="site-footer">
        <p>© 2026 Cloud & Fullstack Lab. Built with ASP.NET Core (.NET 8), React & Firestore.</p>
      </footer>
    </div>
  )
}
