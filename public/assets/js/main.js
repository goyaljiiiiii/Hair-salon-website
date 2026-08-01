// Navigation Menu Toggle Logic
const navToggle = document.querySelector(".nav-toggle");
const navList = document.querySelector("nav ul");
const navbar = document.querySelector("nav");

if (navToggle && navList) {
    navToggle.addEventListener("click", () => {
        const isOpen = navList.classList.toggle("is-open");
        navToggle.classList.toggle("active", isOpen);
        navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    navList.addEventListener("click", (event) => {
        if (event.target.tagName === "A" && navList.classList.contains("is-open")) {
            navList.classList.remove("is-open");
            navToggle.classList.remove("active");
            navToggle.setAttribute("aria-expanded", "false");
        }
    });
}

// Sticky Header Transition on Scroll
window.addEventListener("scroll", () => {
    if (navbar) {
        if (window.scrollY > 50) {
            navbar.classList.add("scrolled");
        } else {
            navbar.classList.remove("scrolled");
        }
    }
});

// ==========================================
// DYNAMIC APPOINTMENT BOOKING SYSTEM
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    const serviceSelect = document.getElementById("booking-service");
    const stylistSelect = document.getElementById("booking-stylist");
    const dateInput = document.getElementById("booking-date");
    const timeSlotsContainer = document.getElementById("time-slots-container");
    const timeSlotsGrid = document.getElementById("time-slots-grid");
    const timeHiddenInput = document.getElementById("booking-time");
    const bookingForm = document.getElementById("appointment-form");

    // Modal elements
    const modal = document.getElementById("booking-modal");
    const modalIcon = document.getElementById("modal-icon");
    const modalTitle = document.getElementById("modal-title");
    const modalMessage = document.getElementById("modal-message");
    const modalCloseSpan = document.querySelector(".close-modal");
    const modalCloseBtn = document.getElementById("modal-close-btn");

    // Invoice elements inside modal
    const receiptInvoice = document.getElementById("receipt-invoice");
    const receiptRefId = document.getElementById("receipt-ref-id");
    const receiptServiceName = document.getElementById("receipt-service-name");
    const receiptServicePrice = document.getElementById("receipt-service-price");
    const receiptAddonsRow = document.getElementById("receipt-addons-row");
    const receiptAddonsNames = document.getElementById("receipt-addons-names");
    const receiptAddonsPrice = document.getElementById("receipt-addons-price");
    const receiptDiscountRow = document.getElementById("receipt-discount-row");
    const receiptDiscountPrice = document.getElementById("receipt-discount-price");
    const receiptFinalPrice = document.getElementById("receipt-final-price");
    const receiptStylistName = document.getElementById("receipt-stylist-name");
    const receiptDate = document.getElementById("receipt-date");
    const receiptTime = document.getElementById("receipt-time");

    // Global variables for billing calculations
    let servicesCatalog = [];
    let activeServicePrice = 0;
    let activeAddonsPrice = 0;
    let activeDiscount = 0;
    let promoCodeString = "";

    // Set minimum date to today
    if (dateInput) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.setAttribute("min", today);
    }

    // Standard business hours (9:00 AM - 5:00 PM)
    const availableSlots = [
        "09:00", "10:00", "11:00", "12:00", 
        "13:00", "14:00", "15:00", "16:00", "17:00"
    ];

    // Helper to format time strings for user display (e.g. "13:00" -> "1:00 PM")
    function formatTimeLabel(timeStr) {
        const [hour, minute] = timeStr.split(":").map(Number);
        const ampm = hour >= 12 ? "PM" : "AM";
        const formattedHour = hour % 12 || 12;
        return `${formattedHour}:${minute < 10 ? "0" + minute : minute} ${ampm}`;
    }

    // Load Services and Stylists on page load
    async function loadFormCatalogs() {
        try {
            // Load Services
            const servicesResponse = await fetch("/api/services");
            const services = await servicesResponse.json();
            
            servicesCatalog = services; // Save globally

            if (serviceSelect) {
                services.forEach(service => {
                    const opt = document.createElement("option");
                    opt.value = service.id;
                    opt.textContent = `${service.name} ($${service.price.toFixed(2)})`;
                    serviceSelect.appendChild(opt);
                });
            }

            // Load Stylists
            const stylistsResponse = await fetch("/api/stylists");
            const stylists = await stylistsResponse.json();
            
            if (stylistSelect) {
                stylists.forEach(stylist => {
                    const opt = document.createElement("option");
                    opt.value = stylist.id;
                    opt.textContent = `${stylist.name} - ${stylist.specialty}`;
                    stylistSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error("Error loading booking dropdown data:", err);
        }
    }

    // Check availability based on selected stylist and date
    async function checkAvailability() {
        if (!stylistSelect || !dateInput || !timeSlotsGrid || !timeSlotsContainer) return;

        const stylistId = stylistSelect.value;
        const dateVal = dateInput.value;

        // Reset selected time slot
        timeHiddenInput.value = "";

        if (!stylistId || !dateVal) {
            timeSlotsGrid.innerHTML = '<span class="slots-placeholder">Please select a stylist and date first.</span>';
            timeSlotsContainer.classList.remove("show");
            return;
        }

        timeSlotsGrid.innerHTML = '<span class="slots-placeholder">Checking availability...</span>';
        timeSlotsContainer.classList.add("show");

        try {
            const res = await fetch(`/api/availability?stylist_id=${stylistId}&date=${dateVal}`);
            const data = await res.json();
            
            if (res.ok) {
                const bookedSlots = data.bookedSlots || [];
                renderTimeSlots(bookedSlots);
                timeSlotsContainer.classList.add("show");
            } else {
                timeSlotsGrid.innerHTML = `<span class="slots-placeholder" style="color: #ff5555;">${data.error || "Failed to load slots."}</span>`;
                timeSlotsContainer.classList.remove("show");
            }
        } catch (err) {
            console.error("Error checking availability:", err);
            timeSlotsGrid.innerHTML = '<span class="slots-placeholder" style="color: #ff5555;">Server error. Please try again.</span>';
            timeSlotsContainer.classList.remove("show");
        }
    }

    // Render slots inside grid
    function renderTimeSlots(bookedSlots) {
        if (!timeSlotsGrid) return;
        timeSlotsGrid.innerHTML = "";

        availableSlots.forEach(time => {
            const isBooked = bookedSlots.includes(time);
            
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "time-slot-btn";
            btn.textContent = formatTimeLabel(time);
            btn.dataset.time = time;

            if (isBooked) {
                btn.classList.add("disabled");
                btn.disabled = true;
            } else {
                btn.addEventListener("click", () => {
                    // Remove selection from others
                    document.querySelectorAll(".time-slot-btn").forEach(el => el.classList.remove("selected"));
                    // Select this one
                    btn.classList.add("selected");
                    timeHiddenInput.value = time;
                });
            }
            timeSlotsGrid.appendChild(btn);
        });
    }

    // Form Event Listeners to query availability
    if (stylistSelect) stylistSelect.addEventListener("change", checkAvailability);
    if (dateInput) dateInput.addEventListener("change", checkAvailability);

    // Modal Actions
    function showModal(isSuccess, title, message) {
        if (!modal) return;
        
        modalTitle.textContent = title;
        modalMessage.textContent = message;

        if (isSuccess) {
            modalIcon.textContent = "✓";
            modalIcon.className = ""; // Successful theme
        } else {
            modalIcon.textContent = "✗";
            modalIcon.className = "error";
            if (receiptInvoice) receiptInvoice.style.display = "none"; // Hide receipt if error
        }

        modal.style.display = "block";
    }

    function closeModal() {
        if (modal) modal.style.display = "none";
    }

    if (modalCloseSpan) modalCloseSpan.addEventListener("click", closeModal);
    if (modalCloseBtn) modalCloseBtn.addEventListener("click", closeModal);
    window.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
    });

    // Recalculate Live Invoice Totals
    function recalculateTotal() {
        const baseSpan = document.getElementById("summary-base");
        const addonsRow = document.getElementById("summary-addons-row");
        const addonsSpan = document.getElementById("summary-addons");
        const discountRow = document.getElementById("summary-discount-row");
        const discountSpan = document.getElementById("summary-discount");
        const totalSpan = document.getElementById("summary-total");
        const priceSummary = document.getElementById("price-summary");

        if (activeServicePrice === 0) {
            priceSummary.style.display = "none";
            return;
        }

        priceSummary.style.display = "block";
        baseSpan.textContent = `$${activeServicePrice.toFixed(2)}`;

        if (activeAddonsPrice > 0) {
            addonsRow.style.display = "flex";
            addonsSpan.textContent = `+$${activeAddonsPrice.toFixed(2)}`;
        } else {
            addonsRow.style.display = "none";
        }

        if (activeDiscount > 0) {
            discountRow.style.display = "flex";
            discountSpan.textContent = `-$${activeDiscount.toFixed(2)}`;
        } else {
            discountRow.style.display = "none";
        }

        const total = activeServicePrice + activeAddonsPrice - activeDiscount;
        totalSpan.textContent = `$${total.toFixed(2)}`;
    }

    // Dropdown change trigger to update pricing
    if (serviceSelect) {
        serviceSelect.addEventListener("change", () => {
            const serviceId = Number(serviceSelect.value);
            const service = servicesCatalog.find(s => s.id === serviceId);
            if (service) {
                activeServicePrice = service.price;
                applyPromoLogic(false); // Recalculate discount silently if code entered
                recalculateTotal();
            }
        });
    }

    // Addons checkbox calculation triggers
    const addonCheckboxes = document.querySelectorAll('input[name="addons"]');
    addonCheckboxes.forEach(cb => {
        cb.addEventListener("change", () => {
            let sum = 0;
            document.querySelectorAll('input[name="addons"]:checked').forEach(checkedCb => {
                sum += Number(checkedCb.dataset.price);
            });
            activeAddonsPrice = sum;
            recalculateTotal();
        });
    });

    // Promo Code Application Logic
    const promoInput = document.getElementById("booking-promo");
    const applyPromoBtn = document.getElementById("apply-promo-btn");

    function applyPromoLogic(shouldAlert = true) {
        if (!promoInput) return;
        const code = promoInput.value.trim().toUpperCase();

        if (activeServicePrice === 0) {
            if (shouldAlert) showModal(false, "Select Service", "Please select a hair service before applying a promo code.");
            return;
        }

        if (code === "") {
            activeDiscount = 0;
            promoCodeString = "";
            promoInput.style.borderColor = "";
            recalculateTotal();
            return;
        }

        if (code === "WELCOME10") {
            activeDiscount = activeServicePrice * 0.10;
            promoCodeString = "WELCOME10";
            promoInput.style.borderColor = "#10b981";
            if (shouldAlert) showModal(true, "Promo Applied!", "10% off has been applied to your base styling service.");
        } else if (code === "GOLD15") {
            activeDiscount = activeServicePrice * 0.15;
            promoCodeString = "GOLD15";
            promoInput.style.borderColor = "#10b981";
            if (shouldAlert) showModal(true, "Promo Applied!", "15% off has been applied to your base styling service.");
        } else {
            activeDiscount = 0;
            promoCodeString = "";
            promoInput.style.borderColor = "#ef4444";
            if (shouldAlert) showModal(false, "Invalid Code", "The entered promo code does not exist or has expired.");
        }
        recalculateTotal();
    }

    if (applyPromoBtn) {
        applyPromoBtn.addEventListener("click", () => applyPromoLogic(true));
    }

    // ==========================================
    // MULTI-STEP BOOKING WIZARD NAVIGATION
    // ==========================================
    let currentStep = 1;
    const steps = document.querySelectorAll(".booking-step");
    const stepIndicators = document.querySelectorAll(".step-indicator");

    function showStep(stepNum) {
        currentStep = stepNum;
        steps.forEach((step, idx) => {
            step.classList.toggle("active", idx + 1 === stepNum);
        });

        stepIndicators.forEach((indicator, idx) => {
            const stepIdx = idx + 1;
            indicator.classList.toggle("active", stepIdx === stepNum);
            indicator.classList.toggle("completed", stepIdx < stepNum);
        });
    }

    // Step 1 Next Trigger
    const step1Next = document.getElementById("step1-next-btn");
    if (step1Next) {
        step1Next.addEventListener("click", () => {
            if (!serviceSelect.value) {
                showModal(false, "Selection Missing", "Please select a styling service from the list before proceeding.");
                return;
            }
            showStep(2);
        });
    }

    // Step 2 Next & Back Triggers
    const step2Back = document.getElementById("step2-back-btn");
    const step2Next = document.getElementById("step2-next-btn");
    if (step2Back) {
        step2Back.addEventListener("click", () => {
            showStep(1);
        });
    }
    if (step2Next) {
        step2Next.addEventListener("click", () => {
            if (!stylistSelect.value || !dateInput.value) {
                showModal(false, "Selection Missing", "Please select both a stylist and an appointment date.");
                return;
            }
            if (!timeHiddenInput.value) {
                showModal(false, "Time Slot Missing", "Please pick one of the available time slots before proceeding.");
                return;
            }
            showStep(3);
        });
    }

    // Step 3 Back Trigger
    const step3Back = document.getElementById("step3-back-btn");
    if (step3Back) {
        step3Back.addEventListener("click", () => {
            showStep(2);
        });
    }

    // Form Submission
    if (bookingForm) {
        bookingForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("booking-name").value.trim();
            const email = document.getElementById("booking-email").value.trim();
            const phone = document.getElementById("booking-phone").value.trim();
            const serviceId = serviceSelect.value;
            const stylistId = stylistSelect.value;
            const date = dateInput.value;
            const time = timeHiddenInput.value;

            if (!time) {
                showModal(false, "Time Slot Missing", "Please pick an available time slot before booking.");
                return;
            }

            // Gather selected addons
            const selectedAddons = Array.from(document.querySelectorAll('input[name="addons"]:checked'))
                .map(el => el.value)
                .join(', ');

            const finalTotal = activeServicePrice + activeAddonsPrice - activeDiscount;

            try {
                const response = await fetch("/api/bookings", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        name,
                        email,
                        phone,
                        service_id: serviceId,
                        stylist_id: stylistId,
                        date,
                        time,
                        promo_code: promoCodeString || null,
                        discount_applied: activeDiscount,
                        add_ons: selectedAddons || null,
                        total_price: finalTotal
                    })
                });

                const result = await response.json();

                if (response.ok) {
                    // Populate Invoice Receipt elements inside success popup
                    const refId = 'MDB-' + Math.floor(1000 + Math.random() * 9000);
                    if (receiptRefId) receiptRefId.textContent = `REF: ${refId}`;

                    const selectedService = serviceSelect.options[serviceSelect.selectedIndex].textContent.split(" ($")[0];
                    if (receiptServiceName) receiptServiceName.textContent = selectedService;
                    if (receiptServicePrice) receiptServicePrice.textContent = `$${activeServicePrice.toFixed(2)}`;

                    if (selectedAddons) {
                        if (receiptAddonsRow) receiptAddonsRow.style.display = "flex";
                        if (receiptAddonsNames) receiptAddonsNames.textContent = selectedAddons;
                        if (receiptAddonsPrice) receiptAddonsPrice.textContent = `+$${activeAddonsPrice.toFixed(2)}`;
                    } else {
                        if (receiptAddonsRow) receiptAddonsRow.style.display = "none";
                    }

                    if (activeDiscount > 0) {
                        if (receiptDiscountRow) receiptDiscountRow.style.display = "flex";
                        if (receiptDiscountPrice) receiptDiscountPrice.textContent = `-$${activeDiscount.toFixed(2)}`;
                    } else {
                        if (receiptDiscountRow) receiptDiscountRow.style.display = "none";
                    }

                    if (receiptFinalPrice) receiptFinalPrice.textContent = `$${finalTotal.toFixed(2)}`;

                    const selectedStylistName = stylistSelect.options[stylistSelect.selectedIndex].textContent.split(" - ")[0];
                    if (receiptStylistName) receiptStylistName.textContent = selectedStylistName;

                    // Readable date
                    const [year, month, day] = date.split("-");
                    const dateObj = new Date(year, month - 1, day);
                    const readableDate = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

                    if (receiptDate) receiptDate.textContent = readableDate;
                    if (receiptTime) receiptTime.textContent = formatTimeLabel(time);

                    if (receiptInvoice) receiptInvoice.style.display = "block"; // Show invoice card

                    showModal(
                        true, 
                        "Booking Request Received!", 
                        `Thank you ${name}! Your styling session is requested. We have generated your receipt below.`
                    );
                    
                    // Reset form and variables
                    bookingForm.reset();
                    activeServicePrice = 0;
                    activeAddonsPrice = 0;
                    activeDiscount = 0;
                    promoCodeString = "";
                    if (promoInput) promoInput.style.borderColor = "";
                    recalculateTotal();

                    timeSlotsGrid.innerHTML = '<span class="slots-placeholder">Please select a stylist and date first.</span>';
                    timeSlotsContainer.classList.remove("show");
                    
                    // Reset wizard back to step 1
                    showStep(1);

                    // Set min date again
                    const today = new Date().toISOString().split("T")[0];
                    dateInput.setAttribute("min", today);
                } else {
                    showModal(false, "Booking Failed", result.error || "An error occurred. Please try again.");
                }
            } catch (err) {
                console.error("Booking submission error:", err);
                showModal(false, "Server Connection Error", "Unable to reach the server. Please verify your internet connection.");
            }
        });
    }

    // ==========================================
    // DYNAMIC TESTIMONIAL REVIEWS SYSTEM
    // ==========================================

    const reviewsTrack = document.getElementById("testimonials-track");
    const writeReviewBtn = document.getElementById("open-review-modal-btn");
    const reviewModal = document.getElementById("review-modal");
    const reviewForm = document.getElementById("review-form");
    const closeReviewModalSpan = document.querySelector(".close-review-modal");

    // Fetch and render reviews inside infinite marquee track
    async function loadReviews() {
        if (!reviewsTrack) return;
        reviewsTrack.innerHTML = '<p style="text-align: center; color: #888; width: 100%;">Loading reviews...</p>';

        try {
            const res = await fetch("/api/reviews");
            const reviews = await res.json();
            
            reviewsTrack.innerHTML = "";

            if (reviews.length === 0) {
                reviewsTrack.innerHTML = '<p style="text-align: center; color: #888; font-style: italic; padding: 2rem; width: 100%;">No reviews yet. Be the first to share your experience!</p>';
                return;
            }

            // Function to create card HTML
            const createCardElement = (review) => {
                const parts = review.name.split(" ");
                const initials = parts.map(p => p[0]).join("").toUpperCase().substring(0, 2) || "P";
                const starString = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);

                const card = document.createElement("div");
                card.className = "testimonial-card";
                card.innerHTML = `
                    <div class="rating">${starString}</div>
                    <blockquote>
                        <p>"${review.comment}"</p>
                    </blockquote>
                    <div class="client-info">
                        <div class="client-avatar">${initials}</div>
                        <div class="client-details">
                            <strong>${review.name}</strong>
                            <span>Verified Patron</span>
                        </div>
                    </div>
                `;
                return card;
            };

            // Render all reviews in the track
            reviews.forEach(review => {
                reviewsTrack.appendChild(createCardElement(review));
            });

            // Clone elements to create a seamless infinite scrolling loop if there are at least 3 reviews
            if (reviews.length >= 3) {
                reviews.forEach(review => {
                    reviewsTrack.appendChild(createCardElement(review));
                });
            }
        } catch (err) {
            console.error("Failed to load reviews catalog:", err);
            reviewsTrack.innerHTML = '<p style="text-align: center; color: #ff5555; font-style: italic; width: 100%;">Failed to load reviews.</p>';
        }
    }

    // Modal triggers for reviews
    if (writeReviewBtn && reviewModal) {
        writeReviewBtn.addEventListener("click", () => {
            reviewModal.style.display = "block";
        });
    }

    if (closeReviewModalSpan) {
        closeReviewModalSpan.addEventListener("click", () => {
            reviewModal.style.display = "none";
        });
    }

    // Submit Review
    if (reviewForm) {
        reviewForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("review-name").value.trim();
            const ratingVal = document.querySelector('input[name="rating"]:checked');
            const comment = document.getElementById("review-comment").value.trim();

            if (!ratingVal) {
                alert("Please select a star rating.");
                return;
            }

            const rating = Number(ratingVal.value);

            try {
                const res = await fetch("/api/reviews", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, rating, comment })
                });

                const result = await res.json();

                if (res.ok) {
                    if (reviewModal) reviewModal.style.display = "none";
                    reviewForm.reset();
                    showModal(true, "Review Submitted!", "Thank you for sharing your experience with Maison de Beauté!");
                    loadReviews(); // Reload testimonials list
                } else {
                    alert(result.error || "Failed to submit review.");
                }
            } catch (err) {
                console.error("Error submitting review:", err);
                alert("Server connection error. Please try again.");
            }
        });
    }

    // Reusable Before/After Comparison Slider Binder
    function bindComparisonSliders() {
        const containers = document.querySelectorAll(".comparison-slider");
        containers.forEach(container => {
            const range = container.querySelector("input[type='range']");
            const afterImg = container.querySelector(".after-image");
            const handle = container.querySelector(".slider-handle-bar");
            
            if (range && afterImg && handle) {
                const update = (val) => {
                    afterImg.style.clipPath = `polygon(${val}% 0, 100% 0, 100% 100%, ${val}% 100%)`;
                    handle.style.left = `${val}%`;
                };
                
                // Initialize position
                update(range.value);
                
                // Bind slider updates
                range.addEventListener("input", (e) => {
                    update(e.target.value);
                });
            }
        });
    }

    // Initialize all comparison sliders (both inline and modal ones)
    bindComparisonSliders();

    // Before/After comparison slider modal logic
    const portfolioModal = document.getElementById("portfolio-modal");
    const sliderDivider = document.getElementById("slider-divider-range");
    const sliderBeforeImg = document.getElementById("slider-before-img");
    const sliderAfterImg = document.getElementById("slider-after-img");
    const portfolioTitle = document.getElementById("portfolio-title");
    const closePortfolioModalSpan = document.querySelector(".close-portfolio-modal");

    // Pre-configured before/after works for stylists (using assets already in the repo)
    const portfolios = {
        alice: {
            title: "Alice's Work: Signature Blowout & Styling",
            before: "assets/images/alice_before.png",
            after: "assets/images/alice_after.png"
        },
        michael: {
            title: "Michael's Work: Precision Color Highlights",
            before: "assets/images/transformation_before.png",
            after: "assets/images/transformation_after.png"
        }
    };

    if (closePortfolioModalSpan) {
        closePortfolioModalSpan.addEventListener("click", () => {
            portfolioModal.style.display = "none";
        });
    }

    // Global click listener to close modals
    window.addEventListener("click", (e) => {
        if (e.target === portfolioModal) {
            portfolioModal.style.display = "none";
        }
        if (e.target === reviewModal) {
            reviewModal.style.display = "none";
        }
    });

    // Scroll Reveal IntersectionObserver
    const revealSections = document.querySelectorAll(".scroll-reveal");
    if (revealSections.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: "0px 0px -50px 0px"
        });
        revealSections.forEach(section => revealObserver.observe(section));
    }

    // FAQ Accordion Click Listeners
    const accordionHeaders = document.querySelectorAll(".accordion-header");
    accordionHeaders.forEach(header => {
        header.addEventListener("click", () => {
            const item = header.parentElement;
            const collapse = header.nextElementSibling;
            const isActive = item.classList.contains("active");

            // Close other open accordion items
            document.querySelectorAll(".faq-accordion-item").forEach(el => {
                if (el !== item) {
                    el.classList.remove("active");
                    const otherCollapse = el.querySelector(".accordion-collapse");
                    if (otherCollapse) {
                        otherCollapse.style.maxHeight = null;
                        otherCollapse.style.opacity = "0";
                    }
                }
            });

            // Toggle current item
            if (isActive) {
                item.classList.remove("active");
                collapse.style.maxHeight = null;
                collapse.style.opacity = "0";
            } else {
                item.classList.add("active");
                collapse.style.maxHeight = collapse.scrollHeight + "px";
                collapse.style.opacity = "1";
            }
        });
    });

    // ==========================================
    // MAISON CONCIERGE CHATBOT WIDGET LOGIC
    // ==========================================
    const chatbotTriggerBtn = document.getElementById("chatbot-trigger-btn");
    const chatbotWindow = document.getElementById("chatbot-window");
    const chatbotMessagesBox = document.getElementById("chatbot-messages-box");
    const chatbotInputForm = document.getElementById("chatbot-input-form");
    const chatbotInputField = document.getElementById("chatbot-input-field");
    const quickReplyChips = document.querySelectorAll(".quick-chip-btn");

    if (chatbotTriggerBtn && chatbotWindow) {
        // Toggle chat window open/close
        chatbotTriggerBtn.addEventListener("click", () => {
            chatbotTriggerBtn.classList.toggle("active");
            chatbotWindow.classList.toggle("show");
            
            // Auto scroll to latest message when opened
            if (chatbotWindow.classList.contains("show") && chatbotMessagesBox) {
                chatbotMessagesBox.scrollTop = chatbotMessagesBox.scrollHeight;
            }
        });

        // Helper to append message bubbles
        function appendChatMessage(sender, text) {
            if (!chatbotMessagesBox) return;
            const msg = document.createElement("div");
            msg.className = `chat-message ${sender}`;
            msg.innerHTML = text;
            chatbotMessagesBox.appendChild(msg);
            chatbotMessagesBox.scrollTop = chatbotMessagesBox.scrollHeight;
        }

        // Typing indicator helpers
        let typingIndicatorEl = null;

        function showTypingIndicator() {
            if (!chatbotMessagesBox || typingIndicatorEl) return;
            typingIndicatorEl = document.createElement("div");
            typingIndicatorEl.className = "chat-message bot";
            typingIndicatorEl.innerHTML = `
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            `;
            chatbotMessagesBox.appendChild(typingIndicatorEl);
            chatbotMessagesBox.scrollTop = chatbotMessagesBox.scrollHeight;
        }

        function removeTypingIndicator() {
            if (typingIndicatorEl) {
                typingIndicatorEl.remove();
                typingIndicatorEl = null;
            }
        }

        // Keyword responses engine
        function getBotResponse(input) {
            const text = input.toLowerCase().trim();
            
            if (text.includes("hour") || text.includes("time") || text.includes("open") || text.includes("location") || text.includes("address") || text.includes("where")) {
                return `Maison de Beauté is located in the heart of the luxury shopping district at <strong>75 Rue de Paris, NY</strong>.<br><br>🕒 <strong>Hours of Operation:</strong><br>• Monday - Friday: 9:00 AM - 8:00 PM<br>• Saturday: 9:00 AM - 6:00 PM<br>• Sunday: Closed`;
            }
            
            if (text.includes("stylist") || text.includes("staff") || text.includes("alice") || text.includes("michael") || text.includes("who")) {
                return `Our master styling team includes:<br><br>💇 <strong>Alice (Senior Stylist):</strong> Specialized in precision cuts, luxury blowouts, and damage-free texture treatments.<br><br>🎨 <strong>Michael (Color Specialist):</strong> Specialized in custom balayage, hand-painted gradients, and premium highlights.`;
            }
            
            if (text.includes("promo") || text.includes("discount") || text.includes("code") || text.includes("coupon") || text.includes("offer")) {
                return `✨ <strong>Active Coupon Promos:</strong><br><br>• <strong>WELCOME10</strong>: Save <strong>10% off</strong> base pricing for your first booking!<br>• <strong>GOLD15</strong>: Save <strong>15% off</strong> any base services.`;
            }
            
            if (text.includes("book") || text.includes("reserve") || text.includes("appointment") || text.includes("schedule") || text.includes("how")) {
                return `To book your appointment, scroll up to our <strong>Reservations Wizard</strong>! Select your service, choose your stylist/date, and download your printable bill receipt invoice instantly.`;
            }
            
            if (text.includes("price") || text.includes("cost") || text.includes("how much") || text.includes("service")) {
                return `Our styling services start at:<br>• <strong>Hair Styling:</strong> from $50<br>• <strong>Hair Coloring:</strong> from $120<br>• <strong>Hair Treatment:</strong> from $80<br><br>Select upgrades on our reservations card to see your real-time invoice totals!`;
            }
            
            if (text.includes("hello") || text.includes("hi") || text.includes("hey") || text.includes("greet")) {
                return `Hello! How can I help you customize your styling experience today?`;
            }

            if (text.includes("thank") || text.includes("cool") || text.includes("perfect") || text.includes("awesome")) {
                return `You are very welcome! We look forward to seeing you at Maison de Beauté.`;
            }

            return `I'm sorry, I didn't quite catch that. Try asking about <strong>hours</strong>, <strong>stylists</strong>, <strong>promos</strong>, or <strong>how to book</strong>!`;
        }

        // Handle typing submission and delay triggers
        function handleUserMessage(queryText) {
            if (!queryText) return;
            appendChatMessage("user", queryText);
            showTypingIndicator();
            
            setTimeout(() => {
                removeTypingIndicator();
                const reply = getBotResponse(queryText);
                appendChatMessage("bot", reply);
            }, 700 + Math.random() * 500);
        }

        // Form text submission
        if (chatbotInputForm && chatbotInputField) {
            chatbotInputForm.addEventListener("submit", (e) => {
                e.preventDefault();
                const query = chatbotInputField.value.trim();
                if (!query) return;
                chatbotInputField.value = "";
                handleUserMessage(query);
            });
        }

        // Quick Reply FAQ Chips click listener
        quickReplyChips.forEach(chip => {
            chip.addEventListener("click", () => {
                const query = chip.getAttribute("data-query");
                let label = chip.textContent;
                
                // Trigger appropriate bot workflow based on chips
                handleUserMessage(label);
            });
        });
    }

    // ==========================================
    // SCROLL TO TOP WIDGET LOGIC
    // ==========================================
    const scrollTopBtn = document.getElementById("scroll-top-btn");
    const scrollProgressBar = document.getElementById("scroll-progress-bar");

    if (scrollTopBtn && scrollProgressBar) {
        window.addEventListener("scroll", () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            
            if (docHeight > 0) {
                const scrollPercent = scrollTop / docHeight;
                // Circumference is 113.1
                const offset = 113.1 - (scrollPercent * 113.1);
                scrollProgressBar.style.strokeDashoffset = offset;
                
                // Toggle show class based on scroll threshold
                if (scrollTop > 300) {
                    scrollTopBtn.classList.add("show");
                } else {
                    scrollTopBtn.classList.remove("show");
                }
            }
        });

        scrollTopBtn.addEventListener("click", () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }

    // ==========================================
    // DYNAMIC STYLISTS TEAM & CAROUSEL LOGIC
    // ==========================================
    const teamGrid = document.querySelector(".team-grid");
    let currentTeamIndex = 0;

    async function loadTeam() {
        if (!teamGrid) return;
        teamGrid.innerHTML = '<p style="text-align: center; color: #888; width: 100%;">Loading stylists...</p>';
        
        try {
            const res = await fetch("/api/stylists");
            const stylists = await res.json();
            
            teamGrid.innerHTML = "";
            
            if (stylists.length === 0) {
                teamGrid.innerHTML = '<p style="text-align: center; color: #888; width: 100%;">No stylists in registry.</p>';
                return;
            }

            stylists.forEach(stylist => {
                const card = document.createElement("div");
                card.className = "team-card";
                
                // Elegant, high-fashion expanded biography fallbacks
                let bio = "";
                if (stylist.specialty.toLowerCase().includes("color")) {
                    bio = "Dedicated to the fine art of hair coloring. Michael specializes in custom hand-painted balayage, multi-dimensional highlighting, structural gloss glazing, and color correction designed to maintain the hair's natural integrity.";
                } else if (stylist.specialty.toLowerCase().includes("stylist") || stylist.specialty.toLowerCase().includes("cut")) {
                    bio = "A master of shape, weight, and movement. Alice brings extensive training in precision geometric cutting, dry-shaping texturization, signature editorial blowouts, and luxury styling tailored to express each client's unique profile.";
                } else {
                    bio = "An accomplished salon artist committed to custom styling consultations, luxury restorative hair treatments, couture braiding, and bespoke care routines that restore lasting shine, volume, and texture.";
                }
                
                card.innerHTML = `
                    <div class="team-image-wrapper">
                        <img src="${stylist.image_url}" alt="${stylist.name} - ${stylist.specialty}" loading="lazy">
                    </div>
                    <div class="team-details">
                        <h3>${stylist.name}</h3>
                        <p class="team-specialty">${stylist.specialty}</p>
                        <p class="stylist-bio">${bio}</p>
                        <div class="team-socials">
                            <a href="#" class="team-social-btn" aria-label="Instagram">Instagram</a>
                            <a href="#" class="team-social-btn" aria-label="Pinterest">Pinterest</a>
                        </div>
                        <button type="button" class="view-portfolio-btn" data-stylist="${stylist.name.toLowerCase()}" style="margin-top: 1.2rem;">View Transformations</button>
                    </div>
                `;
                teamGrid.appendChild(card);
            });

            // Bind click event on new View Portfolio buttons
            bindPortfolioButtons();

            // Configure team carousel
            initTeamCarousel(stylists.length);

        } catch (err) {
            console.error("Error loading team stylists:", err);
            teamGrid.innerHTML = '<p style="text-align: center; color: #ff5555; width: 100%;">Failed to load stylists.</p>';
        }
    }

    function bindPortfolioButtons() {
        const viewPortfolioBtns = document.querySelectorAll(".view-portfolio-btn");
        const portfolioModal = document.getElementById("portfolio-modal");
        const sliderBeforeImg = document.getElementById("slider-before-img");
        const sliderAfterImg = document.getElementById("slider-after-img");
        const portfolioTitle = document.getElementById("portfolio-title");
        const sliderDivider = document.getElementById("slider-divider-range");

        if (viewPortfolioBtns.length > 0 && portfolioModal) {
            viewPortfolioBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    const stylistKey = btn.dataset.stylist;
                    
                    const config = portfolios[stylistKey] || {
                        title: `${btn.parentNode.querySelector("h3").textContent}'s Work: Professional Styling`,
                        before: "assets/images/hair2.jpeg",
                        after: "assets/images/hair1.jpg"
                    };
                    
                    portfolioTitle.textContent = config.title;
                    sliderBeforeImg.src = config.before;
                    sliderAfterImg.src = config.after;
                    
                    if (sliderDivider) {
                        sliderDivider.value = 50;
                        sliderDivider.dispatchEvent(new Event('input'));
                    }
                    
                    portfolioModal.style.display = "block";
                });
            });
        }
    }

    function initTeamCarousel(count) {
        const carouselWrapper = document.querySelector(".team-carousel-wrapper");
        const teamPrevBtn = document.getElementById("team-prev-btn");
        const teamNextBtn = document.getElementById("team-next-btn");
        
        if (!carouselWrapper || !teamGrid) return;

        currentTeamIndex = 0;
        teamGrid.style.transform = "translateX(0)";

        if (count <= 3 || window.innerWidth <= 768) {
            if (teamPrevBtn) teamPrevBtn.style.display = "none";
            if (teamNextBtn) teamNextBtn.style.display = "none";
            teamGrid.style.justifyContent = "center";
            teamGrid.style.width = "100%";
            return;
        }

        if (teamPrevBtn) teamPrevBtn.style.display = "flex";
        if (teamNextBtn) teamNextBtn.style.display = "flex";
        teamGrid.style.justifyContent = "flex-start";
        teamGrid.style.width = "max-content";

        const cardWidth = 320;
        const gap = 32; // gap size (2rem = 32px)
        const slideStep = cardWidth + gap;

        teamNextBtn.onclick = () => {
            const maxIndex = count - 3;
            if (currentTeamIndex < maxIndex) {
                currentTeamIndex++;
                teamGrid.style.transform = `translateX(-${currentTeamIndex * slideStep}px)`;
            }
        };

        teamPrevBtn.onclick = () => {
            if (currentTeamIndex > 0) {
                currentTeamIndex--;
                teamGrid.style.transform = `translateX(-${currentTeamIndex * slideStep}px)`;
            }
        };
    }

    // ==========================================
    // CLIENT RESERVATION LOOKUP MODAL
    // ==========================================
    const openLookupModalBtn = document.getElementById("open-lookup-modal-btn");
    const closeLookupModalBtn = document.getElementById("close-lookup-modal-btn");
    const lookupModalOverlay = document.getElementById("lookup-modal-overlay");
    const clientLookupForm = document.getElementById("client-lookup-form");
    const lookupQueryInput = document.getElementById("lookup-query-input");
    const lookupResultsContainer = document.getElementById("lookup-results-container");

    if (openLookupModalBtn && lookupModalOverlay) {
        openLookupModalBtn.addEventListener("click", (e) => {
            e.preventDefault();
            lookupModalOverlay.style.display = "flex";
            if (lookupQueryInput) lookupQueryInput.focus();
        });
    }

    if (closeLookupModalBtn && lookupModalOverlay) {
        closeLookupModalBtn.addEventListener("click", () => {
            lookupModalOverlay.style.display = "none";
        });
    }

    if (lookupModalOverlay) {
        lookupModalOverlay.addEventListener("click", (e) => {
            if (e.target === lookupModalOverlay) lookupModalOverlay.style.display = "none";
        });
    }

    if (clientLookupForm) {
        clientLookupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const q = lookupQueryInput.value.trim();
            if (!q) return;

            lookupResultsContainer.innerHTML = '<p style="color: #ccc; font-style: italic; text-align: center; padding: 1rem;">Searching system records...</p>';

            try {
                const res = await fetch(`/api/bookings/lookup?q=${encodeURIComponent(q)}`);
                const data = await res.json();

                if (res.ok && data.bookings && data.bookings.length > 0) {
                    lookupResultsContainer.innerHTML = "";
                    data.bookings.forEach(b => {
                        const card = document.createElement("div");
                        card.style.cssText = "background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 1rem; margin-bottom: 0.8rem;";
                        
                        const statusColor = b.status === 'completed' ? '#34d399' : (b.status === 'confirmed' ? '#60a5fa' : (b.status === 'pending' ? '#fcd34d' : '#f87171'));

                        card.innerHTML = `
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="font-weight: 700; color: #fcd34d; font-size: 0.85rem;">#MDB-${b.id}</span>
                                <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; padding: 3px 8px; border-radius: 12px; background: rgba(255,255,255,0.1); color: ${statusColor}; border: 1px solid ${statusColor};">${b.status}</span>
                            </div>
                            <div style="font-weight: 700; font-size: 1rem; color: white;">${b.service_name}</div>
                            <div style="font-size: 0.85rem; color: #aaa; margin: 4px 0;">Stylist: ${b.stylist_name} &bull; ${b.booking_date} @ ${b.booking_time}</div>
                            <div style="font-size: 0.85rem; color: #ddd; font-weight: 600;">Total Paid: $${b.total_price.toFixed(2)}</div>
                        `;
                        lookupResultsContainer.appendChild(card);
                    });
                } else {
                    lookupResultsContainer.innerHTML = `<p style="color: #fca5a5; font-size: 0.9rem; text-align: center; padding: 1rem;">${data.error || 'No matching reservation found.'}</p>`;
                }
            } catch (err) {
                lookupResultsContainer.innerHTML = '<p style="color: #fca5a5; font-size: 0.9rem; text-align: center; padding: 1rem;">Unable to complete search. Please try again.</p>';
            }
        });
    }

    // Run Initial Load
    loadFormCatalogs();
    loadTeam(); // Load team stylists dynamically on load
    loadReviews(); // Load database testimonials on load
});
