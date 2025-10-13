Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Reveal health status on /up that returns 200 if the app boots with no exceptions, otherwise 500.
  # Can be used by load balancers and uptime monitors to verify that the app is live.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api, defaults: { format: :json } do
    resources :sessions, only: %i[index show] do
      collection do
        post :refresh
        get "refresh/:job_id", action: :refresh_status
      end
    end
    get "search", to: "searches#index"
  end
end
