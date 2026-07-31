// PDF Report Export and Excel Export — a richer alternative to the existing
// single-sheet CSV export (js/02-tasks/03-reminders-core.js: exportToCSV),
// covering tasks, habits, and finance together instead of just tasks.
// Uses jsPDF (window.jspdf.jsPDF) and SheetJS (window.XLSX), both loaded
// from jsdelivr.net in index.html — see CHANGELOG.md.

    function getReportData() {
        const reminders = safeStorage("reminders", []).filter(r => !r.archived);
        const habits = safeStorage("habits", []);
        const fin = getFinData();
        const completed = reminders.filter(r => r.status === 'completed').length;
        const pending = reminders.filter(r => r.status !== 'completed').length;
        const now = Date.now();
        const overdue = reminders.filter(r => r.status !== 'completed' && new Date(r.time).getTime() < now).length;
        return { reminders, habits, fin, completed, pending, overdue, summary: renderMonthlyFinanceSummary() };
    }

    // ============================================================
    // PDF REPORT EXPORT
    // ============================================================
    function exportToPDF() {
        if (typeof window.jspdf === 'undefined') {
            return showToast("PDF library still loading — try again in a moment.", "error");
        }
        const { reminders, habits, completed, pending, overdue, summary } = getReportData();
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginX = 15;
        let y = 20;

        function heading(text) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 122, 255);
            doc.text(text, marginX, y);
            doc.setTextColor(30, 30, 30);
            doc.setFont(undefined, 'normal');
            y += 8;
        }
        function row(text, size = 10) {
            if (y > 280) { doc.addPage(); y = 20; }
            doc.setFontSize(size);
            doc.text(text, marginX, y);
            y += 6;
        }
        function ruleLine() {
            doc.setDrawColor(220, 220, 220);
            doc.line(marginX, y, pageWidth - marginX, y);
            y += 6;
        }

        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 122, 255);
        doc.text("Master Reminder App — Report", marginX, y);
        y += 7;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text("Generated " + new Date().toLocaleString(), marginX, y);
        doc.setTextColor(30, 30, 30);
        y += 12;

        heading("Tasks Overview");
        row("Total active tasks: " + (completed + pending));
        row("Completed: " + completed + "    Pending: " + pending + "    Overdue: " + overdue);
        y += 4;
        ruleLine();

        heading("Task List");
        const activeReminders = reminders.filter(r => !r.archived).slice(0, 60);
        if (!activeReminders.length) {
            row("No tasks yet.");
        } else {
            activeReminders.forEach(r => {
                const status = r.status === 'completed' ? '[Done]' : (new Date(r.time).getTime() < Date.now() ? '[Overdue]' : '[Pending]');
                const line = status + ' ' + (r.task || '(untitled)') + ' — ' + new Date(r.time).toLocaleString();
                row(line.length > 95 ? line.slice(0, 92) + '...' : line, 9);
            });
        }
        y += 4;
        ruleLine();

        heading("Habits");
        if (!habits.length) {
            row("No habits yet.");
        } else {
            habits.forEach(h => row(h.name + " — current streak " + (h.streak || 0) + ", best " + (h.maxStreak || 0)));
        }
        y += 4;
        ruleLine();

        heading("Finance Summary (" + summary.month + ")");
        row("Income: Rs. " + summary.mInc.toLocaleString('en-IN'));
        row("Expenses: Rs. " + summary.mExp.toLocaleString('en-IN'));
        row("EMI outgo: Rs. " + summary.emiTotal.toLocaleString('en-IN'));
        row("Net savings: Rs. " + summary.savings.toLocaleString('en-IN') + " (" + summary.savingRate + "% of income)");

        doc.save("Master_App_Report_" + getTodayStr() + ".pdf");
        hapticFeedback && hapticFeedback('success');
        showToast("PDF report downloaded!", "success");
    }

    // ============================================================
    // EXCEL EXPORT (multi-sheet workbook)
    // ============================================================
    function exportToExcel() {
        if (typeof window.XLSX === 'undefined') {
            return showToast("Excel library still loading — try again in a moment.", "error");
        }
        const { reminders, habits, fin } = getReportData();
        const wb = XLSX.utils.book_new();

        const taskRows = reminders.map(r => ({
            Task: r.task || '', Notes: (r.notes || '').replace(/(<([^>]+)>)/gi, ''),
            'Date & Time': r.time || '', Priority: r.priority || 'medium',
            Status: r.status || 'pending', Category: r.category ? r.category.name : 'Task',
            Repeat: r.repeat || 'none'
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows.length ? taskRows : [{ Task: '(no tasks yet)' }]), "Tasks");

        const habitRows = habits.map(h => ({ Habit: h.name, 'Current Streak': h.streak || 0, 'Best Streak': h.maxStreak || 0, 'Last Check-in': h.lastCheckIn || '' }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(habitRows.length ? habitRows : [{ Habit: '(no habits yet)' }]), "Habits");

        const expenseRows = (fin.expenses || []).map(e => ({ Name: e.name, Amount: e.amount, Category: e.category, Date: e.date, Note: e.note || '' }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expenseRows.length ? expenseRows : [{ Name: '(no expenses yet)' }]), "Expenses");

        const incomeRows = (fin.income || []).map(e => ({ Name: e.name, Amount: e.amount, Category: e.category, Date: e.date }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(incomeRows.length ? incomeRows : [{ Name: '(no income logged yet)' }]), "Income");

        XLSX.writeFile(wb, "Master_App_Export_" + getTodayStr() + ".xlsx");
        hapticFeedback && hapticFeedback('success');
        showToast("Excel file downloaded!", "success");
    }
