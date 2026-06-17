const openModal = document.querySelector("[data-open-modal]"),
      modal = document.querySelector("[data-modal]"),
      closeModal = document.querySelector("[data-close-modal]");

openModal.addEventListener("click", () => {
  modal.showModal();
});

closeModal.addEventListener("click", () => {
  modal.close();
});
