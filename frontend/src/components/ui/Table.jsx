export default function Table({ columns, data, onRowClick }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                        {columns.map((col) => (
                            <th
                                key={col.key}
                                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider"
                                style={{ width: col.width }}
                            >
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {data.map((row, idx) => (
                        <tr
                            key={row._id || idx}
                            onClick={() => onRowClick?.(row)}
                            className={`${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''} transition`}
                        >
                            {columns.map((col) => (
                                <td key={col.key} className="px-4 py-3 text-sm text-gray-900">
                                    {col.render ? col.render(row) : row[col.key]}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}