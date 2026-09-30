import { useEffect, useState } from 'react';

export default function TimerComponent({ active, title }) {
    const [seconds, setSeconds] = useState(0);

    useEffect(() => {
        if (!active) return;
        const id = setInterval(() => setSeconds((s) => s + 1), 1000);
        return () => clearInterval(id);
    }, [active]);

    const format = (s) => {
        const h = String(Math.floor(s / 3600)).padStart(2, '0');
        const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
        const sec = String(s % 60).padStart(2, '0');
        return `${h}:${m}:${sec}`;
    };

    return <span title={title}>{format(seconds)}</span>;
}