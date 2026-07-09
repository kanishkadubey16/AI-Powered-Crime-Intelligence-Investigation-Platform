import { timeAgo } from "../../utils/formatters";

const ActivityFeed = ({ activities = [] }) => (
  <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl">
    <div className="px-5 py-4 border-b border-slate-700/50">
      <h3 className="text-slate-100 font-semibold">Activity Feed</h3>
    </div>
    <div className="p-5 space-y-4">
      {activities.map((item, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
          <div>
            <p className="text-slate-300 text-sm">{item.message}</p>
            <p className="text-slate-500 text-xs mt-0.5">{timeAgo(item.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default ActivityFeed;
