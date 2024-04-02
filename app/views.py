import csv, json
from .models import *
import random
import pandas as pd

from django.views.generic import TemplateView
from django.http import (
    HttpResponse,
    HttpResponseForbidden,
    HttpResponseServerError,
    JsonResponse
)
from django.db.models import Q

# Create your views here.
class index(TemplateView):
    template_name = "index.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        zipcodes = sorted([user.zipCode for user in Users.objects.distinct('zipCode')])
        userids = list(Users.objects.values_list('userId', flat=True).order_by('userId'))

        context['zipcodes'] = zipcodes
        context['userIds'] = userids

        return context
    
class take2(TemplateView):
    template_name = "take2.html"

    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        zipcodes = sorted([user.zipCode for user in Users.objects.distinct('zipCode')])
        userids = list(Users.objects.values_list('userId', flat=True).order_by('userId'))

        context['zipcodes'] = zipcodes
        context['userIds'] = userids

        return context

class example(TemplateView):
    template_name = "example.html"

def rating_to_stars(rating):
    full_star = '&#9733;'  # Full star character
    half_star = '&#189;&#9733;'  # Half star character
    empty_star = '&#9734;'  # Empty star character

    stars = full_star * int(rating)
    if rating % 1 == 0.5:
        stars += half_star
    stars += empty_star * (5 - int(rating + 0.5))  # Fill the remaining stars with empty stars
    stars += "</span>"
    stars = "<span class='text-success'>" + stars
    return stars

def cluster_csv(request):
    data = []

    with open('clustering_with_bpr_pickle_coordinates.csv', encoding='utf-8') as f:
        csvReader = csv.DictReader(f)

        for row in csvReader:
            data.append([row["x"], row["y"], row["cluster"], row["user_id"], row["is_representative"]])
        
        return HttpResponse(
            json.dumps(data),
            content_type='application/json'
        )

def fetch_user_info(request):
    userId = request.POST.get('userId')
    if userId == "":
        userId = 1
    user = Users.objects.get(userId=int(userId))
    rating_data = []
    cluster_data = [[0, 0, 0, 0, 0]]
    stereotyping_pos = False
    stereotyping_neg = False
    miscalibration = False

    # Load the dataset
    df = pd.read_csv('df_users_all_bpr.csv')

    # If extra is 1, fetch ratings, cluster data, and additional flags
    if request.POST.get('extra') == '1':
        print("EXTRA!")

        # Find the user row in the DataFrame
        user_row = df[df['userID'] == int(userId)]

        # Determine the flags for stereotyping_pos, stereotyping_neg, and miscalibration
        if not user_row.empty:
            stereotyping_value = user_row['stereotyping'].values[0]
            error_value = user_row['error'].values[0]

            # Set flags based on the thresholds
            if stereotyping_value >= 0.091:
                stereotyping_pos = True
            if stereotyping_value <= -0.053:
                stereotyping_neg = True
            if error_value >= 2.86:
                miscalibration = True

        # Fetch the chronological list of ratings for the user
        ratings = Rating.objects.filter(userId=user).order_by('-timestamp')
        
        # Extract the rating data and store it in a list
        rating_data = [f'<b>"{rating.movie.title}"</b><br>{rating_to_stars(float(rating.rating))}' for rating in ratings]

        with open('clustering_with_bpr_pickle_coordinates.csv', encoding='utf-8') as f:
            user_found = False
            csvReader = csv.DictReader(f)
            for row in csvReader:
                if row["user_id"] == userId:
                    user_found = True
                    cluster = row["cluster"]
                    cluster_data.append([row["x"], row["y"], 1, row["user_id"], 1])

            if user_found:
                f.seek(0)  # reset file pointer to the beginning
                csvReader = csv.DictReader(f)
                for row in csvReader:
                    if row["cluster"] == cluster and row["user_id"] != userId:
                        cluster_data.append([row["x"], row["y"], 1, row["user_id"], 0])
                    else:
                        cluster_data.append([row["x"], row["y"], 0, row["user_id"], 0])
    
    # Update the data dictionary with the new keys
    data = {
        'userId': userId,
        'gender': user.gender,
        'age': user.age,
        'occupation': user.occupation,
        'zipCode': user.zipCode,
        'genreRatings': user.genreRatings,
        'ratings': rating_data,
        'cluster_data': cluster_data,
        'stereotyping_pos': stereotyping_pos,
        'stereotyping_neg': stereotyping_neg,
        'miscalibration': miscalibration
    }

    print(data)

    return HttpResponse(
        json.dumps(data),
        content_type='application/json'
    )

def search_users(request):
    data = [[0, 0, 0, 0, 0]] # Finally found this - the colors get wonky is the first user is representative vs non-representative without this.
    age = request.POST.get("age")
    gender = request.POST.get("gender")
    location = request.POST.get("location")
    occupation = request.POST.get("occupation")
    top_genre = request.POST.get("top_genre")
    
    query = Q()
    if age:
        query &= Q(age=age)
    if gender:
        query &= Q(gender=gender)
    if location:
        query &= Q(zipCode=location)
    if occupation:
        query &= Q(occupation=occupation)
    # if top_genre:
    #     query &= Q(top_genre=top_genre)

    users = Users.objects.filter(query).values_list('userId', flat=True)

    with open('clustering_with_bpr_pickle_coordinates.csv', encoding='utf-8') as f:
        csvReader = csv.DictReader(f)

        if not age and not gender and not location and not occupation and not top_genre:
            for row in csvReader:
                data.append([row["x"], row["y"], 0, row["user_id"], 0])
        else:
            for row in csvReader:
                if int(row["user_id"]) in users:
                    data.append([row["x"], row["y"], 1, row["user_id"], 1])
                else:
                    data.append([row["x"], row["y"], 0, row["user_id"], 0])
        
        return HttpResponse(
            json.dumps(data),
            content_type='application/json'
        )

def get_movies(request):
    random_movies = Movie.objects.order_by('?')[:10]
    movies = {}
    for i, movie in enumerate(random_movies):
        movies[i] = {
            'title': movie.title,
            'year': movie.year,
            'poster': movie.poster,
        }
    return HttpResponse(
        json.dumps(movies),
        content_type='application/json'
    )

# Helper objects and functions for AJAX functionality
switch = {
    'cluster_csv': {'call': cluster_csv},
    'fetch_user_info': {'call': fetch_user_info},
    'search_users': {'call': search_users},
    'get_movies': {'call': get_movies}
}

def ajax(request):
    """Switch to correct function given POST call

    Receives the following from POST:
    call -- What function to redirect to
    """
    post_call = request.POST.get('call', '')

    # Abort if there is no valid call sent to us from Javascript
    if not post_call:
        return HttpResponseServerError()

    # Route the request to the correct handler function
    # and pass request to the functions
    try:
        # select the function from the dictionary
        selection = switch[post_call]
    # If all else fails, handle the error message
    except KeyError:
        return HttpResponseServerError()

    else:
        procedure = selection.get('call')
        validation = selection.get('validation', None)
        if validation:
            valid = validation(request)

            if not valid:
                return HttpResponseForbidden()

        # execute the function
        return procedure(request)
    

