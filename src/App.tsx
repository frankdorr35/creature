import { useEffect, useState } from 'react';
import { usePetStore, MAX_STAT, ACTION_COOLDOWNS_MS } from './store';
import CreatureCanvas from './CreatureCanvas';
import EggCanvas from './EggCanvas';
import './App.css';

function App() {
  const {
    eggPhase,
    warmth,
    bond,
    stability,
    isWobbling,
    isMuted,
    toggleMute,
    warmEgg,
    talkToEgg,
    singToEgg,
    steadyEgg,
    triggerWobble,

    hunger,
    thirst,
    happiness,
    energy,
    health,
    mood,
    tricks,
    cooldowns,
    feed,
    giveWater,
    play,
    pet,
    teach,
    sleep,
    wakeUp,
    isSleeping,
    calculateOfflineDecay,
    updateStatsOverTime
  } = usePetStore();

  const [currentTime, setCurrentTime] = useState(Date.now());

  // Handle ticking timer specifically for cooldown button renders
  useEffect(() => {
     const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
     return () => clearInterval(timer);
  }, []);

  // Handle offline decay on mount and regular updates
  useEffect(() => {
    calculateOfflineDecay();

    // Regular tick to update time and trigger real-time decay periodically
    const interval = setInterval(() => {
        updateStatsOverTime();
    }, 5000); // Tick every 5 seconds

    return () => clearInterval(interval);
  }, [calculateOfflineDecay, updateStatsOverTime]);

  // Handle systemic day/night and egg wobbling
  useEffect(() => {
     const checkTime = () => {
         const hour = new Date().getHours();
         const isNightTime = hour >= 22 || hour < 6; // 10 PM to 6 AM
         
         if (!eggPhase) {
             if (isNightTime && !isSleeping && energy < 30) {
                 sleep();
             } else if (!isNightTime && isSleeping && energy > 80) {
                 wakeUp();
             }
         }
     }
     
     checkTime();
     const interval = setInterval(checkTime, 60000);
     return () => clearInterval(interval);
  }, [eggPhase, energy, isSleeping, sleep, wakeUp]);

  // Handle random egg wobble
  useEffect(() => {
      if (!eggPhase) return;

      const attemptWobble = () => {
          // Trigger wobble 30-90 seconds randomly
          const nextWobbleIn = Math.random() * 60000 + 30000;
          setTimeout(() => {
              // We must use fresh state, so we just blindly trigger store action 
              // which has safety checks
              triggerWobble();
              
              // Schedule next
              attemptWobble();
          }, nextWobbleIn);
      };

      attemptWobble();
      // Component unmount or phase change stops this chain effectively because 
      // triggerWobble ignores actions if !eggPhase.
  }, [eggPhase, triggerWobble]);


  const StatBar = ({ label, value, color }: { label: string, value: number, color: string }) => (
    <div className="stat-container">
      <span className="stat-label">{label}</span>
      <div className="stat-bar-bg">
        <div 
          className="stat-bar-fill" 
          style={{ width: `${(value / MAX_STAT) * 100}%`, backgroundColor: color }}
        />
      </div>
      <span className="stat-value">{Math.round(value)}</span>
    </div>
  );

  const renderTopControls = () => {
      if (eggPhase) {
          let hint = "The egg rests peacefully.";
          if (warmth < 50) hint = "The egg feels cold.";
          if (isWobbling) hint = "The egg is shaking!";
          else if (stability < 50) hint = "The egg looks unsteady.";
          else if (bond > 80) hint = "It's almost ready to hatch!";

          return (
          <header className="header full-width-header column-header">
             <div className="status-readout">
                <h1>Virtual Egg</h1>
                <p className={isWobbling ? 'text-urgent' : ''}>{hint}</p>
                <button onClick={toggleMute} style={{marginTop: '10px', fontSize: '1rem', padding: '4px 8px'}}>{isMuted ? '🔇 Unmute' : '🔊 Mute'}</button>
             </div>
             <div className="stats-panel wide-panel">
                      <StatBar label="Warmth" value={warmth} color="#e67e22" />
                      <StatBar label="Bond" value={bond} color="#9b59b6" />
                      <StatBar label="Stability" value={stability} color="#3498db" />
             </div>
          </header>
      );
  };

      return (
          <header className="header">
             <div className="status-readout">
                <h1>Virtual Pet</h1>
                <p>Mood: <strong>{mood}</strong> {isSleeping ? '(Asleep)' : ''}</p>
                <button onClick={toggleMute} style={{marginTop: '10px', fontSize: '1rem', padding: '4px 8px'}}>{isMuted ? '🔇 Unmute' : '🔊 Mute'}</button>
             </div>
             <div className="stats-panel">
                <StatBar label="Health" value={health} color="#e74c3c" />
                <StatBar label="Hunger" value={hunger} color="#e67e22" />
                <StatBar label="Thirst" value={thirst} color="#3498db" />
                <StatBar label="Happiness" value={happiness} color="#f1c40f" />
                <StatBar label="Energy" value={energy} color="#9b59b6" />
             </div>
          </header>
      );
  };

  const renderBottomControls = () => {
      if (eggPhase) {
          return (
              <footer className="controls">
                  <div className="primary-actions">
                    <button onClick={warmEgg} disabled={isWobbling}>🔥 Warm</button>
                    <button onClick={talkToEgg} disabled={isWobbling}>💬 Talk</button>
                    <button onClick={singToEgg} disabled={isWobbling || warmth < 60}>♫ Sing</button>
                    <button 
                        onClick={steadyEgg} 
                        disabled={!isWobbling} 
                        className={isWobbling ? 'learned' : ''}
                    >
                        ✋ Steady
                    </button>
                  </div>
              </footer>
          );
      }

      const getCooldown = (key: keyof typeof ACTION_COOLDOWNS_MS) => {
         const lastUsed = cooldowns[key];
         const delay = ACTION_COOLDOWNS_MS[key];
         const remaining = Math.max(0, delay - (currentTime - lastUsed));
         return Math.ceil(remaining / 1000); // Seconds
      };

      const feedCd = getCooldown('feed');
      const waterCd = getCooldown('giveWater');
      const playCd = getCooldown('play');
      const petCd = getCooldown('pet');
      const teachCd = getCooldown('teach');

      return (
          <footer className="controls">
              <div className="primary-actions">
                <button onClick={feed} disabled={isSleeping || feedCd > 0}>
                    {feedCd > 0 ? `Feed (${feedCd}s)` : 'Feed'}
                </button>
                <button onClick={giveWater} disabled={isSleeping || waterCd > 0}>
                    {waterCd > 0 ? `Water (${waterCd}s)` : 'Water'}
                </button>
                <button onClick={play} disabled={isSleeping || playCd > 0}>
                    {playCd > 0 ? `Play (${playCd}s)` : 'Play'}
                </button>
                <button onClick={pet} disabled={isSleeping || petCd > 0}>
                    {petCd > 0 ? `Pet (${petCd}s)` : 'Pet'}
                </button>
                <button onClick={isSleeping ? wakeUp : sleep}>{isSleeping ? 'Wake Up' : 'Sleep'}</button>
              </div>
              
              <div className="teaching-actions">
                <h3>Teach Tricks</h3>
                <div className="tricks-list">
                  {(Object.keys(tricks) as Array<keyof typeof tricks>).map(trick => (
                    <button 
                      key={trick} 
                      onClick={() => teach(trick)}
                      disabled={isSleeping || tricks[trick].learned || teachCd > 0}
                      className={tricks[trick].learned ? 'learned' : ''}
                    >
                      {trick} {tricks[trick].learned ? '✓' : `(${Math.round(tricks[trick].progress)}%)`} {teachCd > 0 && !tricks[trick].learned ? `(${teachCd}s)` : ''}
                    </button>
                  ))}
                </div>
              </div>
          </footer>
      );
  };

  return (
    <div className={`app-container ${(!eggPhase && isSleeping) ? 'night' : 'day'}`}>
      {renderTopControls()}

      <main className="canvas-container">
        {eggPhase ? (
            <EggCanvas width={800} height={400} />
        ) : (
            <CreatureCanvas width={800} height={400} />
        )}
      </main>

      {renderBottomControls()}
    </div>
  );
}

export default App;
