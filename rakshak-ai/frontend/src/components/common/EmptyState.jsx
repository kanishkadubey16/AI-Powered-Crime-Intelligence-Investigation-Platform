const EmptyState = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="text-5xl mb-4 text-slate-600">{icon}</div>}
    <h3 className="text-slate-300 font-medium text-lg">{title}</h3>
    {description && <p className="text-slate-500 text-sm mt-1 max-w-sm">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
