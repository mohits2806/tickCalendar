class TickCalendar {
    constructor() {
        // Core data
        this.habits = {};
        this.currentHabitId = null;
        this.today = new Date();
        this.selectedMonth = this.today.getMonth();
        this.selectedYear = this.today.getFullYear();
        
        // DOM Elements
        this.initializeElements();
        
        // Initialize app
        this.loadFromStorage();
        this.setupEventListeners();
        this.render();
        
        // Display initial toast
        if (Object.keys(this.habits).length === 0) {
            this.showToast('Welcome! Create your first habit to get started.');
        }
    }
    
    // Initialize all DOM element references
    initializeElements() {
        // Main elements
        this.habitsList = document.getElementById('habitsList');
        this.mobileHabitsList = document.getElementById('mobileHabitsList');
        this.habitSelect = document.getElementById('habitSelect');
        this.currentMonthElement = document.getElementById('currentMonth');
        this.datesGrid = document.getElementById('datesGrid');
        this.yearHeatmap = document.getElementById('yearHeatmap');
        
        // Stats elements
        this.currentStreakElement = document.getElementById('currentStreak');
        this.longestStreakElement = document.getElementById('longestStreak');
        this.tickedDaysElement = document.getElementById('tickedDays');
        
        // Toast element
        this.toast = document.getElementById('toast');
        
        // Mobile elements
        this.menuToggle = document.getElementById('menuToggle');
        this.sidebar = document.querySelector('.sidebar');
        this.mobilePanel = document.getElementById('mobileHabitsPanel');
    }
    
    // Set up all event listeners
    setupEventListeners() {
        // Navigation
        document.getElementById('prevMonth').addEventListener('click', () => this.navigateMonth(-1));
        document.getElementById('nextMonth').addEventListener('click', () => this.navigateMonth(1));
        
        // Habit management
        document.getElementById('addHabit').addEventListener('click', () => this.showHabitModal());
        document.getElementById('addHabitMobile').addEventListener('click', () => this.showHabitModal());
        document.getElementById('addHabitPanel').addEventListener('click', () => this.showHabitModal());
        document.getElementById('editHabitName').addEventListener('click', () => {
            if (this.currentHabitId) {
                this.showHabitModal('Edit Habit', this.habits[this.currentHabitId].name);
            }
        });
        
        // Habit selector
        this.habitSelect.addEventListener('change', (e) => {
            this.switchHabit(e.target.value);
        });
        
        // Modal actions
        document.getElementById('saveHabit').addEventListener('click', () => this.saveHabit());
        document.getElementById('cancelModal').addEventListener('click', () => this.hideModal());
        
        // Mobile navigation
        document.getElementById('menuToggle').addEventListener('click', () => this.toggleMobileMenu());
        document.getElementById('closeMobilePanel').addEventListener('click', () => this.hideMobilePanel());
        
        // Mobile tabs
        document.getElementById('calendarTab').addEventListener('click', () => this.switchTab('calendar'));
        document.getElementById('habitsTab').addEventListener('click', () => this.showMobilePanel());
        document.getElementById('statsTab').addEventListener('click', () => this.switchTab('stats'));
        
        // Install prompt
        document.getElementById('closePrompt').addEventListener('click', () => {
            document.getElementById('installPrompt').classList.remove('active');
        });
        
        // Swipe detection for calendar
        this.setupSwipeDetection();
    }
    
    // Load data from local storage
    loadFromStorage() {
        const savedData = localStorage.getItem('tickCalendarData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                
                // Convert dates from strings back to Sets
                Object.keys(data.habits).forEach(habitId => {
                    data.habits[habitId].dates = new Set(data.habits[habitId].dates);
                });
                
                this.habits = data.habits;
                this.currentHabitId = data.currentHabitId;
                
                // If current habit doesn't exist anymore, select the first one
                if (this.currentHabitId && !this.habits[this.currentHabitId]) {
                    const habitIds = Object.keys(this.habits);
                    this.currentHabitId = habitIds.length > 0 ? habitIds[0] : null;
                }
            } catch (error) {
                console.error('Error loading data from storage:', error);
                this.habits = {};
                this.currentHabitId = null;
            }
        }
        
        // If no habits exist, create a default one
        if (Object.keys(this.habits).length === 0) {
            const defaultId = 'habit_' + Date.now();
            this.habits[defaultId] = {
                id: defaultId,
                name: 'My First Habit',
                dates: new Set(),
                createdAt: new Date().toISOString()
            };
            this.currentHabitId = defaultId;
        }
        
        this.populateHabitSelectors();
    }
    
    // Save data to local storage
    saveToStorage() {
        // Convert Sets to arrays for JSON serialization
        const dataToSave = {
            habits: {},
            currentHabitId: this.currentHabitId
        };
        
        Object.keys(this.habits).forEach(habitId => {
            dataToSave.habits[habitId] = {
                ...this.habits[habitId],
                dates: Array.from(this.habits[habitId].dates)
            };
        });
        
        localStorage.setItem('tickCalendarData', JSON.stringify(dataToSave));
    }
    
    // Render all UI components
    render() {
        this.renderCalendar();
        this.renderHeatmap();
        this.calculateStats();
        this.populateHabitSelectors();
        this.updateActiveHabit();
    }
    
    // Render the monthly calendar
    renderCalendar() {
        // Update month display
        const monthName = new Date(this.selectedYear, this.selectedMonth, 1)
            .toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        this.currentMonthElement.textContent = monthName;
        
        // Clear existing grid
        this.datesGrid.innerHTML = '';
        
        // Add date cells
        const firstDay = new Date(this.selectedYear, this.selectedMonth, 1);
        const lastDay = new Date(this.selectedYear, this.selectedMonth + 1, 0);
        const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 6 = Saturday
        const daysInMonth = lastDay.getDate();
        
        // Add empty cells for days before the first day of month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'date empty';
            this.datesGrid.appendChild(emptyCell);
        }
        
        // Add cells for each day in the month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateCell = document.createElement('div');
            dateCell.className = 'date';
            dateCell.textContent = day;
            
            // Format date string for comparison
            const dateStr = `${this.selectedYear}-${this.selectedMonth + 1}-${day}`;
            
            // Mark today
            if (this.isToday(day)) {
                dateCell.classList.add('today');
            }
            
            // Mark ticked dates if a habit is selected
            if (this.currentHabitId && this.habits[this.currentHabitId].dates.has(dateStr)) {
                dateCell.classList.add('ticked');
            }
            
            // Add click handler
            dateCell.addEventListener('click', () => this.toggleDate(dateStr, dateCell));
            
            this.datesGrid.appendChild(dateCell);
        }
        
        // Apply a subtle animation to the calendar
        this.datesGrid.classList.add('animating');
        setTimeout(() => {
            this.datesGrid.classList.remove('animating');
        }, 500);
    }
    
    // Render the year heatmap
    renderHeatmap() {
        if (!this.currentHabitId) return;
        
        this.yearHeatmap.innerHTML = '';
        
        // Define date range
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - 364); // Show last 365 days (including today)
        
        // Create grid cells
        for (let day = 0; day < 365; day++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + day);
            
            const dateStr = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            const cell = document.createElement('div');
            cell.className = 'heatmap-cell';
            
            // Calculate intensity based on ticked status
            if (this.habits[this.currentHabitId].dates.has(dateStr)) {
                const shade = 900; // Maximum intensity for ticked days
                cell.style.backgroundColor = `var(--primary-${shade})`;
            } else {
                cell.style.backgroundColor = 'var(--grey-100)';
            }
            
            // Add tooltip with date
            const formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric',
                year: 'numeric'
            });
            cell.title = formattedDate;
            
            // Add click handler
            cell.addEventListener('click', (e) => {
                this.toggleDate(dateStr);
                
                // Update cell appearance immediately
                if (this.habits[this.currentHabitId].dates.has(dateStr)) {
                    e.target.style.backgroundColor = 'var(--primary-900)';
                } else {
                    e.target.style.backgroundColor = 'var(--grey-100)';
                }
                
                this.calculateStats(); // Update stats
            });
            
            this.yearHeatmap.appendChild(cell);
        }
    }
    
    // Calculate and display statistics
    calculateStats() {
        if (!this.currentHabitId) return;
        
        const dates = Array.from(this.habits[this.currentHabitId].dates).sort();
        
        // Calculate total days
        const totalDays = dates.length;
        this.tickedDaysElement.textContent = totalDays;
        
        // Calculate streaks
        const streaks = this.calculateStreaks(dates);
        this.currentStreakElement.textContent = streaks.current;
        this.longestStreakElement.textContent = streaks.longest;
        
        // Apply animations to stats that changed
        const statElements = document.querySelectorAll('.stat-value');
        statElements.forEach(el => {
            el.classList.add('stat-updated');
            setTimeout(() => {
                el.classList.remove('stat-updated');
            }, 500);
        });
    }
    
    // Calculate current and longest streaks from an array of date strings
    calculateStreaks(dates) {
        if (!dates.length) return { current: 0, longest: 0 };
        
        // Convert strings to Date objects for easier comparison
        const dateParsed = dates.map(dateStr => {
            const [year, month, day] = dateStr.split('-').map(Number);
            return new Date(year, month - 1, day);
        }).sort((a, b) => a - b); // Sort dates in ascending order
        
        let currentStreak = 0;
        let longestStreak = 0;
        let currentStrCount = 0;
        
        // Calculate today's date without time
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Check if the most recent date is today or yesterday
        const mostRecent = dateParsed[dateParsed.length - 1];
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        
        const isActiveStreak = 
            (mostRecent.getTime() === today.getTime()) || 
            (mostRecent.getTime() === yesterday.getTime());
        
        // Calculate streaks by finding consecutive dates
        for (let i = 0; i < dateParsed.length; i++) {
            const currentDate = dateParsed[i];
            
            if (i === 0) {
                // Start first streak
                currentStrCount = 1;
            } else {
                const prevDate = dateParsed[i-1];
                const diffDays = this.getDayDifference(prevDate, currentDate);
                
                if (diffDays === 1) {
                    // Consecutive day, continue streak
                    currentStrCount++;
                } else if (diffDays > 1) {
                    // Gap found, reset streak
                    longestStreak = Math.max(longestStreak, currentStrCount);
                    currentStrCount = 1;
                }
                // If diffDays === 0, it's the same day (shouldn't happen with proper data)
            }
        }
        
        // Update longest with the final streak
        longestStreak = Math.max(longestStreak, currentStrCount);
        
        // Set current streak based on if the streak is still active
        currentStreak = isActiveStreak ? currentStrCount : 0;
        
        return { current: currentStreak, longest: longestStreak };
    }
    
    // Get the difference in days between two dates
    getDayDifference(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
        const diffDays = Math.round(Math.abs((date2 - date1) / oneDay));
        return diffDays;
    }
    
    // Check if a day is today
    isToday(day) {
        const today = new Date();
        return (
            day === today.getDate() &&
            this.selectedMonth === today.getMonth() &&
            this.selectedYear === today.getFullYear()
        );
    }
    
    // Toggle date completion status
    toggleDate(dateStr, dateCell = null) {
        if (!this.currentHabitId) return;
        
        const habit = this.habits[this.currentHabitId];
        
        if (habit.dates.has(dateStr)) {
            habit.dates.delete(dateStr);
            if (dateCell) dateCell.classList.remove('ticked');
            this.showToast('Day unmarked');
        } else {
            habit.dates.add(dateStr);
            if (dateCell) dateCell.classList.add('ticked');
            this.showToast('Day marked as complete!');
        }
        
        // Save changes and update stats
        this.saveToStorage();
        this.calculateStats();
    }
    
    // Navigate to previous/next month
    navigateMonth(direction) {
        this.selectedMonth += direction;
        
        if (this.selectedMonth > 11) {
            this.selectedMonth = 0;
            this.selectedYear++;
        } else if (this.selectedMonth < 0) {
            this.selectedMonth = 11;
            this.selectedYear--;
        }
        
        // Apply transition class for animation
        this.datesGrid.style.opacity = '0';
        this.datesGrid.style.transform = direction > 0 ? 'translateX(-20px)' : 'translateX(20px)';
        
        setTimeout(() => {
            this.renderCalendar();
            setTimeout(() => {
                this.datesGrid.style.opacity = '1';
                this.datesGrid.style.transform = 'translateX(0)';
            }, 50);
        }, 200);
    }
    
    // Show habit creation/edit modal
    showHabitModal(title = 'New Habit', habitName = '') {
        const modalTitle = document.getElementById('modalTitle');
        const habitNameInput = document.getElementById('habitName');
        const habitModal = document.getElementById('habitModal');
        
        modalTitle.textContent = title;
        habitNameInput.value = habitName;
        habitModal.classList.add('active');
        
        // Focus the input field
        setTimeout(() => habitNameInput.focus(), 300);
    }
    
    // Hide the modal
    hideModal() {
        document.getElementById('habitModal').classList.remove('active');
    }
    
    // Create or update a habit
    saveHabit() {
        const habitNameInput = document.getElementById('habitName');
        const habitName = habitNameInput.value.trim();
        
        if (!habitName) {
            this.showToast('Please enter a habit name', 'error');
            return;
        }
        
        const modalTitle = document.getElementById('modalTitle').textContent;
        
        if (modalTitle === 'New Habit') {
            // Create new habit
            const newHabitId = 'habit_' + Date.now();
            this.habits[newHabitId] = {
                id: newHabitId,
                name: habitName,
                dates: new Set(),
                createdAt: new Date().toISOString()
            };
            this.currentHabitId = newHabitId;
            this.showToast('Habit created successfully!');
        } else {
            // Update existing habit
            this.habits[this.currentHabitId].name = habitName;
            this.showToast('Habit updated successfully!');
        }
        
        this.saveToStorage();
        this.render();
        this.hideModal();
    }
    
    // Delete a habit
    deleteHabit(habitId) {
        if (confirm(`Are you sure you want to delete "${this.habits[habitId].name}"?`)) {
            delete this.habits[habitId];
            
            // If current habit was deleted, select another one
            if (this.currentHabitId === habitId) {
                const habitIds = Object.keys(this.habits);
                this.currentHabitId = habitIds.length > 0 ? habitIds[0] : null;
            }
            
            this.saveToStorage();
            this.render();
            this.showToast('Habit deleted');
        }
    }
    
    // Switch to a different habit
    switchHabit(habitId) {
        if (this.habits[habitId]) {
            this.currentHabitId = habitId;
            this.saveToStorage();
            this.render();
        }
    }
    
    // Populate habit selector dropdowns and lists
    populateHabitSelectors() {
        // Clear existing options
        this.habitSelect.innerHTML = '';
        this.habitsList.innerHTML = '';
        this.mobileHabitsList.innerHTML = '';
        
        // Sort habits by creation date (newest first)
        const sortedHabits = Object.values(this.habits).sort((a, b) => {
            return new Date(b.createdAt) - new Date(a.createdAt);
        });
        
        // Add each habit to the select and lists
        sortedHabits.forEach(habit => {
            // Add to select dropdown
            const option = document.createElement('option');
            option.value = habit.id;
            option.textContent = habit.name;
            this.habitSelect.appendChild(option);
            
            // Add to sidebar list
            const listItem = document.createElement('li');
            listItem.className = 'habit-item';
            if (habit.id === this.currentHabitId) {
                listItem.classList.add('active');
            }
            
            const habitNameSpan = document.createElement('span');
            habitNameSpan.textContent = habit.name;
            
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'habit-actions';
            
            const editButton = document.createElement('button');
            editButton.className = 'btn-icon-only btn-edit';
            editButton.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24" style="fill: white">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                </svg>
            `;
            editButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showHabitModal('Edit Habit', habit.name);
                this.currentHabitId = habit.id;
            });
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn-icon-only btn-delete';
            deleteButton.innerHTML = `
                <svg viewBox="0 0 24 24" width="24" height="24" style="fill: white">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                </svg>
            `;
            deleteButton.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteHabit(habit.id);
            });
            
            actionsDiv.appendChild(editButton);
            actionsDiv.appendChild(deleteButton);
            
            listItem.appendChild(habitNameSpan);
            listItem.appendChild(actionsDiv);
            
            listItem.addEventListener('click', () => {
                this.switchHabit(habit.id);
                this.hideMobilePanel();
            });
            
            // Create and add desktop list item
            const desktopListItem = listItem.cloneNode(true);
            desktopListItem.addEventListener('click', () => {
                this.switchHabit(habit.id);
            });
            desktopListItem.querySelector('.btn-edit').addEventListener('click', (e) => {
                e.stopPropagation();
                this.showHabitModal('Edit Habit', habit.name);
                this.currentHabitId = habit.id;
            });
            desktopListItem.querySelector('.btn-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteHabit(habit.id);
            });
            this.habitsList.appendChild(desktopListItem);

            // Add mobile list item
            this.mobileHabitsList.appendChild(listItem);
        });
        
        // Update select value
        if (this.currentHabitId) {
            this.habitSelect.value = this.currentHabitId;
        }
    }
    
    // Update active habit highlighting
    updateActiveHabit() {
        // Update sidebar list active state
        const habitItems = document.querySelectorAll('.habit-item');
        habitItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.habitId === this.currentHabitId) {
                item.classList.add('active');
            }
        });
    }
    
    // Mobile UI functions
    toggleMobileMenu() {
        this.menuToggle.classList.toggle('active');
        this.showMobilePanel();
    }
    
    showMobilePanel() {
        this.mobilePanel.classList.add('active');
        document.getElementById('habitsTab').classList.add('active');
        document.getElementById('calendarTab').classList.remove('active');
        document.getElementById('statsTab').classList.remove('active');
    }
    
    hideMobilePanel() {
        this.mobilePanel.classList.remove('active');
        this.menuToggle.classList.remove('active');
        document.getElementById('calendarTab').classList.add('active');
        document.getElementById('habitsTab').classList.remove('active');
    }
    
    switchTab(tab) {
        const tabs = ['calendar', 'habits', 'stats'];
        tabs.forEach(t => {
            document.getElementById(`${t}Tab`).classList.remove('active');
        });
        document.getElementById(`${tab}Tab`).classList.add('active');
        
        if (tab === 'habits') {
            this.showMobilePanel();
        } else {
            this.hideMobilePanel();
        }
        
        // Implement tab-specific logic
        if (tab === 'stats') {
            // Scroll to stats section on mobile
            document.querySelector('.stats-card').scrollIntoView({ behavior: 'smooth' });
        } else if (tab === 'calendar') {
            // Scroll to calendar on mobile
            document.querySelector('.calendar-card').scrollIntoView({ behavior: 'smooth' });
        }
    }
    
    // Toast notification
    showToast(message, type = 'success') {
        const toastMessage = document.querySelector('.toast-message');
        const toastIcon = document.querySelector('.toast-icon');
        
        toastMessage.textContent = message;
        
        if (type === 'error') {
            toastIcon.style.fill = 'var(--error-color)';
            toastIcon.innerHTML = `
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
            `;
        } else {
            toastIcon.style.fill = 'var(--success-color)';
            toastIcon.innerHTML = `
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            `;
        }
        
        this.toast.classList.add('active');
        
        setTimeout(() => {
            this.toast.classList.remove('active');
        }, 3000);
    }
    
    // Setup swipe detection for mobile calendar navigation
    setupSwipeDetection() {
        let touchStartX = 0;
        let touchEndX = 0;
        const calendarCard = document.querySelector('.calendar-card');
        
        calendarCard.addEventListener('touchstart', (e) => {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });
        
        calendarCard.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].screenX;
            this.handleSwipe();
        }, { passive: true });
        
        // Handle the swipe
        this.handleSwipe = () => {
            const swipeThreshold = 50;
            const swipeDistance = touchEndX - touchStartX;
            
            if (Math.abs(swipeDistance) > swipeThreshold) {
                if (swipeDistance > 0) {
                    // Swipe right, go to previous month
                    this.navigateMonth(-1);
                } else {
                    // Swipe left, go to next month
                    this.navigateMonth(1);
                }
            }
        };
    }
}

// Initialize PWA install functionality
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 76+ from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install prompt after a delay
    setTimeout(() => {
        document.getElementById('installPrompt').classList.add('active');
    }, 5000);
});

document.getElementById('installButton').addEventListener('click', async () => {
    if (!deferredPrompt) return;
    
    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Hide the prompt regardless of outcome
    document.getElementById('installPrompt').classList.remove('active');
    
    // We no longer need the prompt
    deferredPrompt = null;
});

// Initialize application when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the application
    const app = new TickCalendar();
    
    // Dark mode toggle (could be extended with a button in the UI)
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark-mode', prefersDarkMode);
    
    // Add page transition animations
    const mainContent = document.querySelector('.main-content');
    mainContent.classList.add('fade-in');
    
    // Add framer-motion animations if the library is loaded
    if (window.framerMotion) {
        const { motion, AnimatePresence } = window.framerMotion;
    }
});