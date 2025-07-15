from django.urls import path
from .views import TaskListCreateView, TaskRetrieveUpdateDestroy

urlpatterns = [
    path('tasks/', TaskListCreateView.as_view(), name='task-list-create'),
    path('tasks/<int:pk>/', TaskRetrieveUpdateDestroy.as_view(), name='task-detail'),
]
