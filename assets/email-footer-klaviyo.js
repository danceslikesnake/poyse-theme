class EmailFooterKlaviyoForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('[data-klaviyo-form]');
    this.input = this.querySelector('[data-klaviyo-email]');
    this.button = this.querySelector('[data-klaviyo-submit]');
    this.successMessage = this.querySelector('[data-klaviyo-success]');
    this.errorMessage = this.querySelector('[data-klaviyo-error]');
    if (!this.form) return;

    this.companyId = this.dataset.companyId;
    this.listId = this.dataset.listId;

    this.form.addEventListener('submit', this.onSubmit.bind(this));
  }

  async onSubmit(event) {
    event.preventDefault();
    if (!this.input.checkValidity()) {
      this.input.reportValidity();
      return;
    }

    this.setLoading(true);
    this.hideMessages();

    try {
      const response = await fetch(`https://a.klaviyo.com/client/subscriptions?company_id=${this.companyId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.api+json',
          revision: '2025-10-15',
        },
        body: JSON.stringify({
          data: {
            type: 'subscription',
            attributes: {
              custom_source: 'Email footer',
              profile: {
                data: {
                  type: 'profile',
                  attributes: {
                    email: this.input.value,
                    subscriptions: {
                      email: {
                        marketing: {
                          consent: 'SUBSCRIBED',
                        },
                      },
                    },
                  },
                },
              },
            },
            relationships: {
              list: {
                data: {
                  type: 'list',
                  id: this.listId,
                },
              },
            },
          },
        }),
      });

      // Klaviyo's client subscribe endpoint returns 202 with no body on success.
      if (!response.ok) throw new Error(`Klaviyo responded with ${response.status}`);

      this.form.reset();
      this.showMessage(this.successMessage);
    } catch (error) {
      this.showMessage(this.errorMessage);
    } finally {
      this.setLoading(false);
    }
  }

  setLoading(isLoading) {
    this.button.disabled = isLoading;
    this.button.classList.toggle('email-footer__button--loading', isLoading);
  }

  hideMessages() {
    this.successMessage?.setAttribute('hidden', '');
    this.errorMessage?.setAttribute('hidden', '');
  }

  showMessage(element) {
    if (!element) return;
    element.removeAttribute('hidden');
    element.setAttribute('tabindex', '-1');
    element.focus();
  }
}

customElements.define('email-footer-klaviyo-form', EmailFooterKlaviyoForm);
