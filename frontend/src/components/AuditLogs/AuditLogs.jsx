import { useEffect, useState } from "react";
import Header from "../Header/header"


export default function AuditLogs() {

    const [logs, setLogs] = useState([]);
    const [loading, setloading] = useState(true);


    const statusColorMap = {
        Created: "bg-green-100 text-green-700 border-green-300",
        Updated: "bg-blue-100 text-blue-700 border-blue-300",
        Deleted: "bg-red-100 text-red-700 border-red-300",
        Canceled: "bg-red-100 text-red-700 border-red-300",
        Relocated: "bg-indigo-100 text-indigo-700 border-indigo-300",
        Login: "bg-purple-100 text-purple-700 border-purple-300",
        Logout: "bg-gray-100 text-gray-700 border-gray-300",
        default: "bg-gray-100 text-gray-700 border-gray-300",
    };

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch("http://localhost/phpmyadmin/index.php?route=/sql&pos=0&db=db_compliance_audit&table=logs");
                const data = await res.json();
                const sorted = [...data].sort(
                    (a, b) => new Date(b.Timestamp) - new Date(a.Timestamp)
                );
                setLogs(sorted);
            } catch (err) {
                console.error("Failed to load audit logs:", err);
            } finally {
                setloading(false);
            }
        };

        fetchLogs();
    }, []);
    const formatTimeStamp = (Timestamp) => {
        if (!timestamp) return { time: "", date: "" };
        const d = new Date(timestamp);

        const time = d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        const date = d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });

        return { time, date };
    };


    return (
        <div className="px-6 pb-6 pt-6 w-full">
            <Header pageTitle="Audit Logs" />

            <div className="mt-4 bg-white rounded-md shadow-md border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-200">
                    <h2 className="text-xl font-semibold" style={{ color: "#121212" }}>
                        Activity History
                    </h2>
                </div>

                {loading ? (
                    <div className="px-4 py-6 text-sm text-gray-500">Loading logs...</div>
                ) : logs.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">
                        No audit logs found.
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {logs.map((log) => {
                            const color =
                                statusColorMap[log.Action] || statusColorMap.default;
                            const { time, date } = formatTimestamp(log.Timestamp);

                            return (
                                <div
                                    key={log.LogID}
                                    className="flex items-start justify-between px-4 py-3 text-sm hover:bg-gray-50 transition"
                                >
                                    {/* Left: status + message */}
                                    <div className="flex items-start gap-3">
                                        <span
                                            className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border ${color}`}
                                        >
                                            {log.Action}
                                        </span>
                                        <div className="leading-snug">
                                            {/* Details from backend */}
                                            <p className="text-gray-800">{log.Details}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">
                                                By{" "}
                                                <span className="font-medium">
                                                    {log.UserID || "System"}
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    {/* Right: time + date */}
                                    <div className="text-right text-xs text-gray-500 whitespace-nowrap">
                                        <div>{time}</div>
                                        <div>{date}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}



