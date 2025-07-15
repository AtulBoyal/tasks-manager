from django.db import models

class Task(models.Model):
    name = models.CharField(max_length=255)
    factor = models.CharField(max_length=20)
    last_date = models.DateField()

    def __str__(self):
        return self.name
