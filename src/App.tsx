import { useEffect } from 'react';
import { usePetStore, MAX_STAT } from './store';
import CreatureCanvas from './CreatureCanvas';
import './App.css';

function App() {
  const {
    hunger,
    thirst,
    happiness,
    energy,
    health,
    mood,
    tricks,
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

  // Handle offline decay on mount and regular updates
  useEffect(() => {
    calculateOfflineDecay();

    // Regular tick to update time and trigger offline calc periodically
    const interval = setInterval(() => {
        updateStatsOverTime();
        calculateOfflineDecay();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [calculateOfflineDecay, updateStatsOverTime]);

  // Handle systemic day/night
  useEffect(() => {
     const checkTime = () => {
         const hour = new Date().getHours();
         const isNightTime = hour >= 22 || hour < 6; // 10 PM to 6 AM
         
         if (isNightTime && !isSleeping && energy < 30) {
             sleep();
         } else if (!isNightTime && isSleeping && energy > 80) {
             wakeUp();
         }
     }
     
     checkTime();
     const interval = setInterval(checkTime, 60000);
     return () => clearInterval(interval);
  }, [energy, isSleeping, sleep, wakeUp]);


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

  return (
    <div className={`app-container ${isSleeping ? 'night' : 'day'}`}>
      <header className="header">
         <div className="status-readout">
            <h1>Virtual Pet</h1>
            <p>Mood: <strong>{mood}</strong> {isSleeping ? '(Asleep)' : ''}</p>
         </div>
         <div className="stats-panel">
            <StatBar label="Health" value={health} color="#e74c3c" />
            <StatBar label="Hunger" value={hunger} color="#e67e22" />
            <StatBar label="Thirst" value={thirst} color="#3498db" />
            <StatBar label="Happiness" value={happiness} color="#f1c40f" />
            <StatBar label="Energy" value={energy} color="#9b59b6" />
         </div>
      </header>

      <main className="canvas-container">
        <CreatureCanvas width={800} height={400} />
      </main>

      <footer className="controls">
          <div className="primary-actions">
            <button onClick={feed} disabled={isSleeping}>Feed</button>
            <button onClick={giveWater} disabled={isSleeping}>Water</button>
            <button onClick={play} disabled={isSleeping}>Play</button>
            <button onClick={pet} disabled={isSleeping}>Pet</button>
            <button onClick={isSleeping ? wakeUp : sleep}>{isSleeping ? 'Wake Up' : 'Sleep'}</button>
          </div>
          
          <div className="teaching-actions">
            <h3>Teach Tricks</h3>
            <div className="tricks-list">
              {(Object.keys(tricks) as Array<keyof typeof tricks>).map(trick => (
                <button 
                  key={trick} 
                  onClick={() => teach(trick)}
                  disabled={isSleeping || tricks[trick].learned}
                  className={tricks[trick].learned ? 'learned' : ''}
                >
                  {trick} {tricks[trick].learned ? '✓' : `(${Math.round(tricks[trick].progress)}%)`}
                </button>
              ))}
            </div>
          </div>
      </footer>
    </div>
  );
}

export default App;
